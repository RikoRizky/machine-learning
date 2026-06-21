from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import mysql.connector
from mysql.connector import Error

app = Flask(__name__)
CORS(app)

# ========== KONFIGURASI DATABASE ==========
DB_CONFIG = {
    'host': 'localhost',
    'database': 'kaggle',   # ganti dengan database Anda
    'user': 'root',         # ganti dengan user Anda
    'password': ''          # ganti dengan password Anda
}

def get_db_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

# ========== LOAD MODEL DAN ARTEFAK ==========
model = joblib.load('model_multi.pkl')
le = joblib.load('le_jk_multi.pkl')
fitur_kolom = joblib.load('fitur_kolom.pkl')
target_kolom = joblib.load('target_kolom.pkl')
df_ml = joblib.load('df_ml_multi.pkl')
y_pred = joblib.load('y_pred_multi.pkl')

# ========== FUNGSI KLASIFIKASI ==========
def cek_status_bbu(z):
    if z > 2.0: return "Risiko Berat Badan Lebih"
    elif -2.0 <= z <= 2.0: return "Berat Badan Normal"
    elif -3.0 <= z < -2.0: return "Berat Badan Kurang (Underweight)"
    else: return "Berat Badan Sangat Kurang"

def cek_status_tbu(z):
    if z > 3.0: return "Tinggi"
    elif -2.0 <= z <= 3.0: return "Normal"
    elif -3.0 <= z < -2.0: return "Pendek (Stunted)"
    else: return "Sangat Pendek (Severely Stunted)"

def cek_status_bbtb(z):
    if z > 3.0: return "Obesitas"
    elif 2.0 <= z <= 3.0: return "Gizi Lebih"
    elif 1.0 <= z < 2.0: return "Risiko Gizi Lebih"
    elif -2.0 <= z <= 1.0: return "Gizi Baik (Normal)"
    elif -3.0 <= z < -2.0: return "Gizi Kurang (Wasted)"
    else: return "Gizi Buruk (Severely Wasted)"

def dapatkan_saran_tindakan(txt_bbu, txt_tbu, txt_bbtb):
    if "Ekstrem" in txt_bbu or "Ekstrem" in txt_tbu or "Ekstrem" in txt_bbtb:
        return "⚠️ INTERVENSI ANOMALI: Data pertumbuhan anak berada jauh di atas batas normal populasi umum. Terindikasi adanya kelainan medis makrosomia atau gigantisme. Segera jadwalkan konsultasi dengan Dokter Spesialis Anak Ahli Endokrinologi."
    if "Sangat Kurang" in txt_bbu or "Sangat Pendek" in txt_tbu or "Gizi Buruk" in txt_bbtb:
        return ("⚠️ INTERVENSI KRITIS: Rujuk anak segera ke Rumah Sakit/Puskesmas untuk penanganan gizi buruk (tata laksana gizi buruk). "
                "Berikan Formula 75/Formula 100 atas pengawasan medis, serta suplemen mikronutrien lengkap.")
    elif "Pendek" in txt_tbu or "Gizi Kurang" in txt_bbtb or "Kurang (Underweight)" in txt_bbu:
        return ("⚠️ INTERVENSI INTENSIF: Anak terindikasi mengalami Stunting/Gizi Kurang. Prioritaskan asupan Protein Hewani konsentrasi tinggi "
                "(telur, ikan, daging ayam) setiap hari. Lakukan konseling pemberian makan bayi dan anak (PMBA) di Posyandu terdekat.")
    elif "Obesitas" in txt_bbtb or "Gizi Lebih" in txt_bbtb or "Lebih" in txt_bbu:
        return ("ℹ️ SARAN EDUKASI: Batasi asupan makanan manis tinggi gula atau gorengan lemak jenuh. "
                "Tingkatkan aktivitas fisik motorik anak secara berkala dan jadwalkan diet gizi seimbang dengan ahli nutrisi.")
    else:
        return "✅ KONDISI OPTIMAL: Pertumbuhan anak sangat baik dan normal. Pertahankan pola makan gizi seimbang serta rutin ke Posyandu setiap bulan."

# ========== ENDPOINT PREDIKSI ==========
@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    try:
        jk = data['jk']
        umur = float(data['umur'])
        bb = float(data['bb'])
        tb = float(data['tb'])
    except KeyError:
        return jsonify({'error': 'Data tidak lengkap'}), 400

    if jk not in le.classes_:
        return jsonify({'error': f'Jenis Kelamin harus {list(le.classes_)}'}), 400
    if umur < 0:
        return jsonify({'error': 'Umur tidak boleh negatif'}), 400

    jk_enc = le.transform([jk])[0]
    input_df = pd.DataFrame([[jk_enc, umur, bb, tb]], columns=fitur_kolom)
    pred = model.predict(input_df)[0]
    z_bbu, z_tbu, z_bbtb = pred[0], pred[1], pred[2]

    # Override anomali
    if tb > 165.0:
        z_tbu = 99.99
        txt_tbu = "Sangat Tinggi (Ekstrem / Indikasi Gigantisme)"
    else:
        txt_tbu = cek_status_tbu(z_tbu)
    if bb > 75.0:
        z_bbu = 99.99
        z_bbtb = 99.99
        txt_bbu = "Berat Badan Sangat Lebih (Ekstrem Anomali)"
        txt_bbtb = "Obesitas Morbid Ekstrem"
    else:
        txt_bbu = cek_status_bbu(z_bbu)
        txt_bbtb = cek_status_bbtb(z_bbtb)

    saran = dapatkan_saran_tindakan(txt_bbu, txt_tbu, txt_bbtb)

    # Kirim hasil prediksi termasuk input data
    return jsonify({
        'jk': jk,
        'umur': umur,
        'bb': bb,
        'tb': tb,
        'z_bbu': round(z_bbu, 4),
        'z_tbu': round(z_tbu, 4),
        'z_bbtb': round(z_bbtb, 4),
        'status_bbu': txt_bbu,
        'status_tbu': txt_tbu,
        'status_bbtb': txt_bbtb,
        'saran': saran
    })

# ========== ENDPOINT SIMPAN KE DATABASE ==========
@app.route('/save', methods=['POST'])
def save_prediction():
    data = request.get_json()
    # Data yang diharapkan: jk, umur, bb, tb, z_bbu, z_tbu, z_bbtb, status_bbu, status_tbu, status_bbtb, saran
    try:
        jk = data['jk']
        umur = float(data['umur'])
        bb = float(data['bb'])
        tb = float(data['tb'])
        z_bbu = float(data['z_bbu'])
        z_tbu = float(data['z_tbu'])
        z_bbtb = float(data['z_bbtb'])
        status_bbu = data['status_bbu']
        status_tbu = data['status_tbu']
        status_bbtb = data['status_bbtb']
        saran = data['saran']
    except KeyError as e:
        return jsonify({'error': f'Missing field: {e}'}), 400

    # Batasi nilai Z-score
    z_bbu = max(min(z_bbu, 99.99), -99.99)
    z_tbu = max(min(z_tbu, 99.99), -99.99)
    z_bbtb = max(min(z_bbtb, 99.99), -99.99)

    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()
    try:
        # Pastikan kolom yang diperlukan ada (jika belum, tambahkan)
        cursor.execute("""
            ALTER TABLE ml 
            ADD COLUMN IF NOT EXISTS jk VARCHAR(10),
            ADD COLUMN IF NOT EXISTS umur_bln DECIMAL(5,1),
            ADD COLUMN IF NOT EXISTS berat_kg DECIMAL(5,2),
            ADD COLUMN IF NOT EXISTS tinggi_cm DECIMAL(5,2)
        """)
        conn.commit()
    except Error as e:
        print("Error altering table:", e)
        pass

    query_insert = """
    INSERT INTO ml (
        jk, umur_bln, berat_kg, tinggi_cm,
        prediksi_zscore_bbu, prediksi_zscore_tbu, prediksi_zscore_bbtb,
        status_bbu_ai, status_tbu_ai, status_bbtb_ai, saran_tindakan
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    valores = (
        jk, umur, bb, tb,
        z_bbu, z_tbu, z_bbtb,
        status_bbu, status_tbu, status_bbtb, saran
    )

    try:
        cursor.execute(query_insert, valores)
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Data saved successfully'}), 201
    except Error as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({'error': str(e)}), 500

# ========== ENDPOINT EVALUASI (TETAP) ==========
@app.route('/evaluation', methods=['GET'])
def evaluation():
    sample_idx = np.random.choice(len(df_ml), size=min(1000, len(df_ml)), replace=False)
    y_true = df_ml[target_kolom].iloc[sample_idx]
    y_pred_sample = y_pred[sample_idx]

    scatter_data = {}
    for i, col in enumerate(target_kolom):
        scatter_data[col] = {
            'actual': y_true[col].tolist(),
            'predicted': y_pred_sample[:, i].tolist()
        }

    importances = model.feature_importances_.tolist()
    features = fitur_kolom

    return jsonify({
        'scatter': scatter_data,
        'feature_importance': {
            'features': features,
            'importances': importances
        },
        'targets': target_kolom
    })

if __name__ == '__main__':
    app.run(debug=True, port=5001)
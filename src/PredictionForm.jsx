import React, { useState } from 'react';
import axios from 'axios';
import ResultDisplay from './ResultDisplay';

const PredictionForm = () => {
  const [form, setForm] = useState({ jk: 'F', umur: '', bb: '', tb: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Fungsi untuk menyimpan ke database
  const saveToDatabase = async (data) => {
    try {
      await axios.post('/save', data);
      console.log('✅ Data berhasil disimpan ke database');
    } catch (err) {
      console.error('❌ Gagal menyimpan ke database:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('/predict', form);
      const resultData = response.data;
      setResult(resultData);
      // Simpan ke database setelah prediksi berhasil
      await saveToDatabase(resultData);
    } catch (err) {
      setError(err.response?.data?.error || 'Terjadi kesalahan');
    }
    setLoading(false);
  };

  return (
    <div className="card">
      <h2 className="section-title">🔮 Input Data Anak</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="jk">Jenis Kelamin</label>
            <select id="jk" name="jk" value={form.jk} onChange={handleChange}>
              <option value="F">Perempuan (F)</option>
              <option value="M">Laki-laki (M)</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="umur">Umur (bulan)</label>
            <input
              type="number"
              id="umur"
              name="umur"
              value={form.umur}
              onChange={handleChange}
              placeholder="Contoh: 24"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="bb">Berat Badan (kg)</label>
            <input
              type="number"
              step="0.1"
              id="bb"
              name="bb"
              value={form.bb}
              onChange={handleChange}
              placeholder="Contoh: 12.5"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="tb">Tinggi Badan (cm)</label>
            <input
              type="number"
              step="0.1"
              id="tb"
              name="tb"
              value={form.tb}
              onChange={handleChange}
              placeholder="Contoh: 85"
              required
            />
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '⏳ Memproses...' : '🔍 Prediksi'}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div style={{ marginTop: '16px', color: '#e53e3e', background: '#fed7d7', padding: '12px', borderRadius: '10px' }}>
          ❌ {error}
        </div>
      )}

      {result && <ResultDisplay result={result} />}
    </div>
  );
};

export default PredictionForm;
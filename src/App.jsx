import React from 'react';
import PredictionForm from './PredictionForm';
import EvaluationCharts from './EvaluationCharts';

function App() {
  return (
    <div className="app-container">
      <h1>📊 Sistem Prediksi Status Gizi Anak</h1>
      <p className="subtitle">Berdasarkan standar Kemenkes RI dan model AI Random Forest</p>
      
      <PredictionForm />
      
      <hr />
      
      <EvaluationCharts />
    </div>
  );
}

export default App;
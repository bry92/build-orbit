import { useState } from 'react';

function App() {
  const [items, setItems] = useState([]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 sm:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Clone Git Repository</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-gray-500">Loading items...</p>
        </div>
      </div>
    </div>
  );
}

export default App;
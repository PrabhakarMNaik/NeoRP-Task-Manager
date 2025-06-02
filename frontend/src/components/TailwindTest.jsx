// Temporary test component to verify Tailwind is working
// Place in src/components/TailwindTest.jsx

import React from 'react';

const TailwindTest = () => {
  return (
    <div className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen">
      {/* Test Tailwind Classes */}
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Tailwind CSS Test
        </h1>
        
        {/* Test Glass Container */}
        <div className="glass-container p-6 rounded-2xl mb-6">
          <h2 className="text-xl font-semibold mb-4">Glass Morphism Test</h2>
          <p className="text-gray-600">
            This should have a glass effect with blur and transparency.
          </p>
        </div>

        {/* Test 3D Button */}
        <button className="btn-3d bg-blue-500 text-white px-6 py-3 rounded-xl mb-6 w-full">
          3D Button Test (should lift on hover)
        </button>

        {/* Test Focus Glow */}
        <input 
          type="text" 
          placeholder="Focus glow test (click to see glow)"
          className="focus-glow w-full p-3 border rounded-xl focus:outline-none"
        />

        {/* Test Custom Colors */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="h-16 bg-neorp-500 rounded-lg"></div>
          <div className="h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg"></div>
          <div className="h-16 bg-glass-light rounded-lg border border-glass-border"></div>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          ✅ If you can see styled elements above, Tailwind is working correctly!
        </p>
      </div>
    </div>
  );
};

export default TailwindTest;
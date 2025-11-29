'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            CentrAlign AI
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            AI-Powered Dynamic Form Generator
          </p>
          <p className="text-gray-500">
            Create intelligent, shareable forms with context-aware memory
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/login"
            className="block w-full bg-indigo-600 text-white text-center py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="block w-full bg-white text-indigo-600 text-center py-3 px-6 rounded-lg font-semibold border-2 border-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            Sign Up
          </Link>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Features</h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Natural language form generation
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Context-aware memory from past forms
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Image upload support
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Public shareable forms
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Submission tracking dashboard
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}


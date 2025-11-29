'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formsAPI, submissionsAPI } from '@/lib/api';
import { removeToken } from '@/lib/auth';
import toast from 'react-hot-toast';
import { Plus, Trash2, ExternalLink, FileText } from 'lucide-react';

interface Form {
  _id: string;
  title: string;
  description?: string;
  shareableId: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      const response = await formsAPI.getAll();
      setForms(response.data.forms);
    } catch (error: any) {
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this form?')) return;

    try {
      await formsAPI.delete(id);
      toast.success('Form deleted');
      loadForms();
    } catch (error: any) {
      toast.error('Failed to delete form');
    }
  };

  const handleLogout = () => {
    removeToken();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-gray-900">CentrAlign Dashboard</h1>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/generate"
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                New Form
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 px-4 py-2"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {forms.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No forms yet</h2>
            <p className="text-gray-600 mb-6">Create your first AI-powered form</p>
            <Link
              href="/dashboard/generate"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Generate Form
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => (
              <div key={form._id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{form.title}</h3>
                {form.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{form.description}</p>
                )}
                <div className="flex items-center justify-between mt-4">
                  <Link
                    href={`/form/${form.shareableId}`}
                    target="_blank"
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Form
                  </Link>
                  <Link
                    href={`/dashboard/submissions/${form._id}`}
                    className="text-gray-600 hover:text-gray-900 text-sm"
                  >
                    Submissions
                  </Link>
                  <button
                    onClick={() => handleDelete(form._id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}


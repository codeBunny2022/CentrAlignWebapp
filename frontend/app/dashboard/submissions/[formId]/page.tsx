'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { submissionsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';

interface Submission {
  id: string;
  data: Record<string, any>;
  imageUrls?: string[];
  submittedAt: string;
}

interface Form {
  id: string;
  title: string;
  shareableId: string;
}

export default function SubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.formId as string;
  const [form, setForm] = useState<Form | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubmissions();
  }, [formId]);

  const loadSubmissions = async () => {
    try {
      const response = await submissionsAPI.getByFormId(formId);
      setForm(response.data.form);
      setSubmissions(response.data.submissions);
    } catch (error: any) {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
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
          <div className="flex items-center h-16 gap-4">
            <Link
              href="/dashboard"
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              {form?.title || 'Submissions'}
            </h1>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {submissions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600">No submissions yet</p>
            {form && (
              <Link
                href={`/form/${form.shareableId}`}
                target="_blank"
                className="mt-4 inline-block text-indigo-600 hover:text-indigo-700"
              >
                View form →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {submissions.map((submission, index) => (
              <div key={submission.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Submission #{submissions.length - index}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {new Date(submission.submittedAt).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-3">
                  {Object.entries(submission.data).map(([key, value]) => {
                    // Skip image URLs that are displayed separately
                    if (submission.imageUrls?.includes(String(value))) {
                      return null;
                    }

                    return (
                      <div key={key} className="border-b border-gray-100 pb-2">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <span className="ml-2 text-gray-900">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </span>
                      </div>
                    );
                  })}

                  {submission.imageUrls && submission.imageUrls.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ImageIcon className="w-5 h-5 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">Uploaded Images</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {submission.imageUrls.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={url}
                              alt={`Upload ${idx + 1}`}
                              className="w-full h-32 object-cover rounded-lg hover:opacity-80 transition-opacity"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}


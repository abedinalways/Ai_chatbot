'use client';

import { FormEvent, useState } from 'react';

export default function Home() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!message.trim() || loading) return;

    try {
      setLoading(true);
      setResponse('');

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          previousInteractionId: interactionId,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to get AI response.');
      }

      if (!res.body) {
        throw new Error('Response body is empty.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let accumulatedResponse = '';

      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, {
          stream: true,
        });

        const events = chunk.split('\n\n').filter(Boolean);

        for (const event of events) {
          if (!event.startsWith('data: ')) {
            continue;
          }

          const json = event.replace('data: ', '');

          const data = JSON.parse(json);

          // Save interaction ID
          if (data.type === 'interaction_id') {
            setInteractionId(data.id);
          }

          // Append text
          if (data.type === 'text') {
            accumulatedResponse += data.text;

            setResponse(accumulatedResponse);
          }
        }
      }

      setMessage('');
    } catch (error) {
      console.error(error);

      setResponse(
        error instanceof Error ? error.message : 'Something went wrong.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
        <h1 className="mb-8 text-3xl font-bold">AI Assistant</h1>

        <div className="flex-1 rounded-xl border border-slate-800 bg-slate-900 p-6">
          {response ? (
            <div>
              <p className="mb-2 text-sm text-slate-400">AI</p>

              <p className="whitespace-pre-wrap leading-7">{response}</p>
            </div>
          ) : (
            <p className="text-slate-500">Ask me anything...</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
          <input
            value={message}
            onChange={event => setMessage(event.target.value)}
            placeholder="Ask something..."
            disabled={loading}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500"
          />

          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Thinking...' : 'Send'}
          </button>
        </form>
      </div>
    </main>
  );
}

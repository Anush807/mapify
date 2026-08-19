import { useState, type FormEvent } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SUGGESTIONS = ['Learn Rust', 'Become a data engineer', 'Master watercolour painting'];

interface TopicInputProps {
  onSubmit: (topic: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function TopicInput({ onSubmit, loading = false, disabled = false }: TopicInputProps) {
  const [topic, setTopic] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = topic.trim();
    if (trimmed.length >= 3) onSubmit(trimmed);
  };

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="What do you want to learn?"
          maxLength={120}
          disabled={loading || disabled}
          className="h-11 flex-1 text-base"
          aria-label="Roadmap topic"
        />
        <Button
          type="submit"
          size="lg"
          disabled={loading || disabled || topic.trim().length < 3}
          className="sm:w-auto"
        >
          <Sparkles />
          {loading ? 'Generating…' : 'Generate roadmap'}
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Try:</span>
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => setTopic(suggestion)}
            disabled={loading || disabled}
            className="rounded-full border bg-card px-3 py-1 text-xs transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

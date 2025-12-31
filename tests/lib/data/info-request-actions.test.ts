import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createInfoRequest, submitInfoResponse } from '@/lib/data/actions';
import * as server from '@/lib/supabase/server';
import * as auth from '@/lib/auth/server';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth/server', () => ({
  getSessionWithProfile: vi.fn().mockResolvedValue({
    session: { user: { id: 'user-1' } },
    profile: { role: 'staff', full_name: 'Staff User' },
  }),
}));

describe('createInfoRequest', () => {
  const mockSupabase = {
    from: vi.fn((table: string) => {
      if (table === 'info_requests') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'info-request-1',
                  intake_response_id: 'intake-1',
                  questions: [
                    { type: 'short_text', question: 'What is your company name?', required: true },
                  ],
                  message: 'Please provide additional information',
                  status: 'pending',
                },
                error: null,
              }),
            })),
          })),
        };
      } else if (table === 'intake_responses') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        };
      } else if (table === 'audit_logs') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(server, 'supabaseEnvReady').mockReturnValue(true);
    vi.spyOn(server, 'supabaseAdmin').mockReturnValue(mockSupabase as any);
  });

  it('creates info request with questions and message', async () => {
    const formData = new FormData();
    formData.set('intakeResponseId', '550e8400-e29b-41d4-a716-446655440000');
    formData.set(
      'questions',
      JSON.stringify([
        { type: 'short_text', question: 'What is your company name?', required: true },
      ])
    );
    formData.set('message', 'Please provide additional information');

    const result = await createInfoRequest(formData);

    expect(result.ok).toBe(true);
    expect(result.data).toHaveProperty('id', 'info-request-1');
    expect(mockSupabase.from).toHaveBeenCalledWith('info_requests');
    expect(mockSupabase.from).toHaveBeenCalledWith('intake_responses');
    expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
  });

  it('validates at least 1 question is required', async () => {
    const formData = new FormData();
    formData.set('intakeResponseId', '550e8400-e29b-41d4-a716-446655440000');
    formData.set('questions', JSON.stringify([]));

    const result = await createInfoRequest(formData);

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe('submitInfoResponse', () => {
  const mockSupabase = {
    from: vi.fn((table: string) => {
      if (table === 'info_requests') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'info-request-1',
                    intake_response_id: 'intake-1',
                    status: 'completed',
                    responses: { question1: 'Answer 1' },
                    responded_at: '2025-01-15T12:00:00Z',
                  },
                  error: null,
                }),
              })),
            })),
          })),
        };
      } else if (table === 'intake_responses') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        };
      }
      return {};
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(server, 'supabaseEnvReady').mockReturnValue(true);
    vi.spyOn(server, 'supabaseAdmin').mockReturnValue(mockSupabase as any);
    vi.spyOn(auth, 'getSessionWithProfile').mockResolvedValue({
      session: { user: { id: 'user-1' } },
      profile: { role: 'client', full_name: 'Client User' },
    } as any);
  });

  it('submits info response and updates status', async () => {
    const formData = new FormData();
    formData.set('infoRequestId', '550e8400-e29b-41d4-a716-446655440001');
    formData.set('responses', JSON.stringify({ question1: 'Answer 1' }));

    const result = await submitInfoResponse(formData);

    expect(result.ok).toBe(true);
    expect(result.data).toHaveProperty('id', 'info-request-1');
    expect(mockSupabase.from).toHaveBeenCalledWith('info_requests');
    expect(mockSupabase.from).toHaveBeenCalledWith('intake_responses');
  });

  it('validates required fields', async () => {
    const formData = new FormData();
    formData.set('infoRequestId', 'invalid-uuid');
    formData.set('responses', JSON.stringify({ question1: 'Answer 1' }));

    const result = await submitInfoResponse(formData);

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

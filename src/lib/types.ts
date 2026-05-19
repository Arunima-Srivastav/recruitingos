export interface Opportunity {
  id: string;
  user_id: string;
  company: string | null;
  role_title: string | null;
  source: string;
  stage: string;
  priority_score: number;
  deadline: string | null;
  next_action: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  opportunity_id: string | null;
  user_id: string;
  source: string;
  sender_name: string | null;
  sender_email: string | null;
  subject: string | null;
  body: string;
  received_at: string | null;
  extracted_json: ExtractedRecruitingData | null;
  external_message_id: string | null;
  created_at: string;
}

export interface Action {
  id: string;
  opportunity_id: string | null;
  user_id: string;
  action_type: string;
  title: string;
  description: string | null;
  due_at: string | null;
  status: string;
  priority_score: number;
  created_at: string;
}

export interface Draft {
  id: string;
  opportunity_id: string | null;
  user_id: string;
  draft_type: string;
  tone: string;
  body: string;
  created_at: string;
}

export interface ExtractedRecruitingData {
  company: string | null;
  role_title: string | null;
  recruiter_name: string | null;
  recruiter_email: string | null;
  deadline: string | null;
  stage: string;
  next_action: string | null;
  action_type: string;
  is_time_sensitive: boolean;
  confidence: number;
  short_summary: string;
}

export interface ActionWithOpportunity extends Action {
  opportunity?: Opportunity | null;
}

export interface PriorityResult {
  score: number;
  reasons: string[];
}

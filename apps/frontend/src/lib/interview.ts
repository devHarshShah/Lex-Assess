import { api } from './api-client';

export interface Interviewer {
  id: string;
  name: string;
  email: string;
  interviewerProfile?: {
    specializations: { id: string; name: string }[];
    bio?: string;
  };
  interviewSlots?: InterviewSlot[];
}

export interface InterviewSlot {
  id: string;
  interviewerId: string;
  interviewer: Interviewer;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

export interface Interview {
  id: string;
  studentId: string;
  student?: {
    id: string;
    name: string;
    email: string;
  };
  interviewerId: string;
  interviewer?: Interviewer;
  slot: InterviewSlot;
  meetLink?: string;
  marks?: number;
  notes?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
}

export const fetchInterviewers = async () => {
  return api.get<Interviewer[]>('/interviews/interviewers');
};

export const createInterviewer = async (data: { email: string; name: string; specializations: string[]; bio?: string }) => {
  return api.post<Interviewer>('/interviews/interviewers', data);
};

export const deleteInterviewer = async (id: string) => {
  return api.delete(`/interviews/interviewers/${id}`);
};

export const createSlot = async (data: { interviewerId: string; startTime: string; endTime: string }) => {
  return api.post<InterviewSlot>('/interviews/slots', data);
};

export const fetchAvailableSlots = async (specialization?: string) => {
  return api.get<InterviewSlot[]>(`/interviews/available-slots${specialization ? `?specialization=${specialization}` : ''}`);
};

export const checkCanSchedule = async () => {
  return api.get<boolean>('/interviews/can-schedule');
};

export const scheduleInterview = async (slotId: string) => {
  return api.post<Interview>('/interviews/schedule', { slotId });
};

export interface CompanyInterview {
  id: string;
  companyId: string;
  studentId: string;
  student?: { id: string; name: string; email: string };
  scheduledAt: string;
  notes?: string | null;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
}

export const companyScheduleInterview = async (studentId: string, scheduledAt: string, notes?: string) => {
  return api.post<CompanyInterview>(`/interviews/company-schedule/${studentId}`, { scheduledAt, notes });
};

export const fetchCompanyInterviews = async () => {
  return api.get<CompanyInterview[]>('/interviews/company-interviews');
};

export const completeCompanyInterview = async (companyInterviewId: string, notes?: string) => {
  return api.post<CompanyInterview>(`/interviews/company-interviews/${companyInterviewId}/complete`, { notes });
};

export const fetchMyInterviews = async () => {
  return api.get<Interview[]>('/interviews/my-interviews');
};

export const fetchInterviewerSessions = async () => {
  return api.get<Interview[]>('/interviews/sessions');
};

export const fetchMySlots = async () => {
  return api.get<InterviewSlot[]>('/interviews/my-slots');
};

export const addMySlot = async (data: { startTime: string; endTime: string }) => {
  return api.post<InterviewSlot>('/interviews/my-slots', data);
};

export const bulkAddMySlots = async (data: { 
  daysOfWeek: number[]; 
  startTime: string; 
  endTime: string; 
  durationMinutes: number;
  breakMinutes: number;
  startDate: string; 
  endDate: string; 
}) => {
  return api.post<{ count: number }>('/interviews/my-slots/bulk', data);
};

export const adminBulkAddSlots = async (interviewerId: string, data: { 
  daysOfWeek: number[]; 
  startTime: string; 
  endTime: string; 
  durationMinutes: number;
  breakMinutes: number;
  startDate: string; 
  endDate: string; 
}) => {
  return api.post<{ count: number }>(`/interviews/slots/bulk/${interviewerId}`, data);
};

export const deleteSlot = async (slotId: string) => {
  return api.delete(`/interviews/slots/${slotId}`);
};

export const addFeedback = async (interviewId: string, data: { marks: number; notes: string }) => {
  return api.post<Interview>(`/interviews/${interviewId}/feedback`, data);
};

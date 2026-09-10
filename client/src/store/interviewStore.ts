import { interviewService } from "@/services/interviewService";
import type {
  Difficulty,
  InterviewStore,
  Topic,
} from "@/types/interview.types";
import { create } from "zustand";

const initialState = {
  interviewId: null,
  topic: null,
  difficulty: null,
  maxQuestions: 0,
  questionsAsked: 0,
  currentQuestion: null,
  status: "IDLE" as const,
  lastScore: null,
  overallScore: null,
  isLoading: false,
  error: null,
};

export const useInterviewStore = create<InterviewStore>((set, get) => ({
  ...initialState,

  startInterview: async (topic: Topic, difficulty: Difficulty) => {
    set({ isLoading: true, error: null });
    try {
      const data = await interviewService.startInterview({
        topic,
        difficulty,
      });

      set({
        interviewId: data.interviewId,
        topic: data.topic,
        difficulty: data.difficulty,
        maxQuestions: data.maxQuestions,
        currentQuestion: data.question,
        questionsAsked: 0,
        status: "ONGOING",
        lastScore: null,
        overallScore: null,
      });

      return data.interviewId;
    } catch (error) {
      set({ error: "Failed to start interview" });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  submitAnswer: async (answer: string) => {
    const { interviewId, currentQuestion } = get();

    if (!interviewId || !currentQuestion) {
      throw new Error("No active interview to submit an answer to.");
    }

    set({ isLoading: true, error: null });
    try {
      const data = await interviewService.submitAnswer(interviewId, {
        questionId: currentQuestion.questionId,
        answer,
      });

      set((state) => ({
        lastScore: data.score,
        questionsAsked: state.questionsAsked + 1,
        currentQuestion: data.completed
          ? null
          : (data.nextQuestion ?? null),
        status: data.completed ? "COMPLETED" : "ONGOING",
      }));

      return { completed: data.completed };
    } catch (error) {
      set({ error: "Failed to submit answer" });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // The backend only calculates overallScore here (averaging Answer docs),
  // so this must run once the last answer has been submitted.
  endInterview: async () => {
    const { interviewId } = get();
    if (!interviewId) return;

    set({ isLoading: true, error: null });
    try {
      const data = await interviewService.endInterview(interviewId);
      set({
        overallScore: data.overallScore,
        status: "COMPLETED",
      });
    } catch (error) {
      set({ error: "Failed to finalize interview" });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  reset: () => set({ ...initialState }),
}));

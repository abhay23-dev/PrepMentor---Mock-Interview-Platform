import { NextFunction, Request, Response } from "express";
export declare const startInterview: (req: Request, res: Response, next: NextFunction) => void;
export declare const submitAnswer: (req: Request, res: Response, next: NextFunction) => void;
export declare const getInterviewHistory: (req: Request, res: Response, next: NextFunction) => void;
export declare const getInterviewById: (req: Request, res: Response, next: NextFunction) => void;
export declare const endInterview: (req: Request, res: Response, next: NextFunction) => void;

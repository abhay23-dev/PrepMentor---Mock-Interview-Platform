import { NextFunction, Request, Response } from "express";
export declare const startSession: (req: Request, res: Response, next: NextFunction) => void;
export declare const nextTurn: (req: Request, res: Response, next: NextFunction) => void;
export declare const submitMessage: (req: Request, res: Response, next: NextFunction) => void;
export declare const endSession: (req: Request, res: Response, next: NextFunction) => void;
export declare const getSessionById: (req: Request, res: Response, next: NextFunction) => void;
export declare const getSessionHistory: (req: Request, res: Response, next: NextFunction) => void;

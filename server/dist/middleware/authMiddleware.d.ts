import { NextFunction, Request, Response } from "express";
declare global {
    namespace Express {
        interface Request {
            userId: string;
        }
    }
}
export declare const requireAuth: (req: Request, res: Response, next: NextFunction) => void;

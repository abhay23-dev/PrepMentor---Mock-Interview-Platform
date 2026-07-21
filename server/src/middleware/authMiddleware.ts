import { NextFunction, Request, Response } from "express"
import { AppError } from "./errorHandler";
import jwt from "jsonwebtoken";

declare global{
  namespace Express{
    interface Request {
      userId: string
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {

  //Bearer sdfdsgjdsjslf.dsdg.s/fsddfgfgk
  //Bearer --> it means that he who holds the string after Bearer word can be allowed to do the task
  //A token contain three different parts header, payload and cryptographic signature

  const authHeader = req.headers.authorization;
  if(!authHeader){
    throw new AppError("No token provided. Please login.", 401);
  }

  const parts = authHeader.split(" ");
  if(parts.length !== 2 || parts[0] !== "Bearer"){
    throw new AppError("Invalid token format. Use: Bearer <token>", 401);
  }

  const token = parts[1];
  const secret = process.env.JWT_SECRET;
  if(!secret){
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  //{userId: "1234345", iat: 12314355, exp: 13435454656}
  const decoded = jwt.verify(token, secret) as {userId: string};

  req.userId = decoded.userId;

  next();
}
import { Router } from "express";
import mongoose from "mongoose";
import { Todo } from "../models/Todo.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 });
    return res.json(todos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "할 일을 불러오지 못했습니다." });
  }
});

router.post("/", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) {
    return res.status(400).json({ message: "할 일을 입력하세요." });
  }

  try {
    const todo = await Todo.create({ text });
    return res.status(201).json(todo);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "할 일을 저장하지 못했습니다." });
  }
});

router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "올바르지 않은 할 일 ID입니다." });
  }

  const update = {};
  if (Object.hasOwn(req.body ?? {}, "text")) {
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (!text) {
      return res.status(400).json({ message: "할 일을 입력하세요." });
    }
    update.text = text;
  }
  if (Object.hasOwn(req.body ?? {}, "done")) {
    if (typeof req.body.done !== "boolean") {
      return res.status(400).json({ message: "완료 여부는 true 또는 false여야 합니다." });
    }
    update.done = req.body.done;
  }
  if (Object.keys(update).length === 0) {
    return res.status(400).json({ message: "수정할 내용을 입력하세요." });
  }

  try {
    const todo = await Todo.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
    if (!todo) {
      return res.status(404).json({ message: "할 일을 찾을 수 없습니다." });
    }
    return res.json(todo);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "할 일을 수정하지 못했습니다." });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "올바르지 않은 할 일 ID입니다." });
  }

  try {
    const todo = await Todo.findByIdAndDelete(id);
    if (!todo) {
      return res.status(404).json({ message: "할 일을 찾을 수 없습니다." });
    }
    return res.json(todo);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "할 일을 삭제하지 못했습니다." });
  }
});

export default router;

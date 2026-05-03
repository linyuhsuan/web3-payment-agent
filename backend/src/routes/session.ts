import { Router } from "express";
import { deleteSession } from "../agent/sessions";

const router = Router();

router.delete("/:walletAddress", (req, res) => {
  deleteSession(req.params.walletAddress);
  res.json({ ok: true });
});

export default router;

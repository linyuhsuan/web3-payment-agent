import { Router } from "express";
import { getBalances } from "../tools/getBalances";
import { asyncHandler } from "../middleware/errors";
import { requireAddress } from "../middleware/validate";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const address = requireAddress(req.query.address, "address");
    const result = await getBalances(address);
    res.json(result);
  })
);

export default router;

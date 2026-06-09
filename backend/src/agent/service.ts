import { createLeafSubname } from "../suins.ts";
import dotenv from "dotenv";
import { SUIN_PARENT_NFT_ID } from "../utils/platform_constant.ts";

dotenv.config();

export class AgentService {
  async createAgent(name: string) {
    try {
      const agent = { name };
      // todo create agent onchain identity
      createLeafSubname(name, SUIN_PARENT_NFT_ID, targetAddress);
      return agent;
    } catch (e) {
      console.log(e);
    }
  }
}

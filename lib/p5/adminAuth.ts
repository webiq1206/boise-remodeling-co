import {getValidatedSession,getUserFromDb} from "../auth";
import {DraftError} from "./store";
export async function requireEstimatorAdmin(){
  const session=await getValidatedSession();if(!session?.userId)throw new DraftError("Administrator sign-in is required.",401);
  const user=await getUserFromDb(session.userId);if(!user||user.role!=="admin")throw new DraftError("Administrator access is required.",403);
  return {id:String(user.id),email:String(user.email||"").toLowerCase()};
}

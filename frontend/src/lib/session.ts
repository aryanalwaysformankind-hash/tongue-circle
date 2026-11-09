// Session boundary: auth is an httpOnly cookie the backend owns; the frontend's one
// duty is wiping the react-query cache so one account's data never renders for the next.
import { queryClient } from "./queryClient";

// Call after every successful login/signup.
export function beginSession(): void {
  queryClient.clear();
}

// Clerk owns sign-out; clear cached member data before returning to the welcome screen.
export async function endSession(redirectTo: string = "/"): Promise<void> {
  queryClient.clear();
  window.location.assign(redirectTo);
}

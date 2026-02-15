import { toast } from "react-toastify";

/** Error toast - does NOT auto-dismiss, user must close manually */
export function toastError(message: string) {
  return toast.error(message, { autoClose: false });
}

/** Success toast - auto-dismisses after 5 seconds */
export function toastSuccess(message: string) {
  return toast.success(message);
}

/** Info toast - auto-dismisses after 5 seconds */
export function toastInfo(message: string) {
  return toast.info(message);
}

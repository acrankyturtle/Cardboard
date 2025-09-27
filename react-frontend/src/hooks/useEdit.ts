import { Dispatch, SetStateAction, useState } from "react";

export const useEdit = <S>(
  unchanged: S | undefined,
): [S | undefined, Dispatch<SetStateAction<S>>] => {
  const [state, setState] = useState<S | undefined>(unchanged);
  return [
    state !== undefined ? state : unchanged,
    (s) => setState(s as SetStateAction<S | undefined>),
  ];
};

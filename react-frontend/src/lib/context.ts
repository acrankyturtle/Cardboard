// import { createContext, ReactNode, useContext } from "react";
//
// export interface AppContext {
//   views: readonly AppView[];
//   dispatch: (action: AppAction) => void;
// }
//
// export type AppAction = AppActionBase & NewViewAction & CloseViewAction;
//
// interface AppActionBase {
//   id: string;
//   type: string;
// }
//
// interface NewViewAction extends AppActionBase {
//   type: "newView";
//   background?: boolean;
// }
//
// export const contextReducer = (context: AppContext, action: AppAction) => {
//   switch (action.type) {
//     case "newView": {
//       return {
//         ...context,
//         views: [...context.views, action.view],
//       };
//     }
//     default:
//       throw new Error(`Unknown action type: ${action.type}`);
//   }
// };
//
// const Context = createContext<AppContext>(null!);
//
// export const useAppContext = () => {
//   const context = useContext(Context);
//   if (!context) {
//     throw new Error("useAppContext must be used within an AppProvider");
//   }
//   return context;
// };
//
// interface AppView {
//   id: string;
//   name: string;
//   icon?: ReactNode;
//   body: ReactNode;
//   state: ViewState;
//   tryClose?: () => void;
// }
//
// abstract class View<T extends ViewState> {
//   public id: string;
//   public name: string;
//   public icon?: ReactNode;
//   public body: ReactNode;
// }
//
// interface ViewState {
//   [key: string]: any;
// }

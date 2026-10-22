import { omit } from "lodash/fp";
import { Machine, assign } from "xstate";
import { httpClient } from "../utils/asyncUtils";
import { User, TransactionCreatePayload } from "../models";
import { authService } from "./authMachine";
import { backendPort } from "../utils/portUtils";

export interface CreateTransactionMachineSchema {
  states: {
    stepOne: {};
    stepTwo: {
      states: {
        editing: {};
        submitting: {};
        failed: {};
      };
    };
    stepThree: {};
  };
}

export type CreateTransactionMachineEvents =
  | { type: "SET_USERS" }
  | { type: "CREATE" }
  | { type: "RESET" };

export interface CreateTransactionMachineContext {
  sender: User;
  receiver: User;
  transactionDetails: TransactionCreatePayload;
}

export const createTransactionMachine = Machine<
  CreateTransactionMachineContext,
  CreateTransactionMachineSchema,
  CreateTransactionMachineEvents
>(
  {
    id: "createTransaction",
    initial: "stepOne",
    states: {
      stepOne: {
        entry: "clearContext",
        on: {
          SET_USERS: "stepTwo",
        },
      },
      stepTwo: {
        entry: "setSenderAndReceiver",
        initial: "editing",
        states: {
          editing: {
            on: {
              CREATE: { target: "submitting", actions: "setTransactionDetails" },
            },
          },
          submitting: {
            invoke: {
              src: "createTransaction",
              onDone: {
                target: "#createTransaction.stepThree",
                actions: "refreshAuth",
              },
              onError: { target: "failed" },
            },
          },
          failed: {
            on: {
              CREATE: { target: "submitting", actions: "setTransactionDetails" },
            },
          },
        },
      },
      stepThree: {
        on: {
          RESET: "stepOne",
        },
      },
    },
  },
  {
    services: {
      createTransaction: async (ctx) => {
        const payload = omit("type", ctx.transactionDetails);
        const response = await httpClient.post(`http://localhost:${backendPort}/transactions`, payload);
        return response.data;
      },
    },
    actions: {
      setSenderAndReceiver: assign((ctx, event: any) => ({
        sender: event.sender,
        receiver: event.receiver,
      })),
      setTransactionDetails: assign((ctx, event: any) => ({
        transactionDetails: event,
      })),
      refreshAuth: () => authService.send("REFRESH"),
      clearContext: assign((ctx, event: any) => ({})),
    },
  }
);

import { defineAuth } from "@aws-amplify/backend";

export const auth = defineAuth({
  loginWith: {
    email: true,
    username: true,
  },
  oauth: {
    providers: ["Google"],
  }
});

import { declareValuePlugin, PluginKind } from "@stryker-mutator/api/plugin";

const puppeteerCallbacks = new Map([
  ["evaluate", 0],
  ["waitForFunction", 0],
  ["$$eval", 1],
]);

export const strykerPlugins = [
  declareValuePlugin(PluginKind.Ignore, "puppeteer-callbacks", {
    /** @param {import("@babel/traverse").NodePath} argument */
    shouldIgnore(argument) {
      const call = argument.parentPath;
      if (
        argument.listKey !== "arguments" ||
        !(argument.isArrowFunctionExpression() || argument.isFunctionExpression()) ||
        !call?.isCallExpression()
      )
        return;

      const callee = call.node.callee;
      if (
        callee.type === "MemberExpression" &&
        callee.object.type === "Identifier" &&
        callee.object.name === "page" &&
        !callee.computed &&
        callee.property.type === "Identifier" &&
        puppeteerCallbacks.get(callee.property.name) === argument.key
      )
        return "Puppeteer serializes this callback into Chrome, outside Stryker's test runtime";
    },
  }),
];

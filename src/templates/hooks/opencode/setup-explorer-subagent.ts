export default async ({ project, client, $, directory, worktree }) => {
  return {
    tool: {
      execute: {
        before: (input, output) => {
          if (input.tool === "task" && output.args?.subagent_type === "Explore") {
            output.args.subagent_type = "buildforce-explorer";
          }
        },
      },
    },
  };
};

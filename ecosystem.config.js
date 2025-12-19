module.exports = {
  apps : [{
    name   : "onboarding-backend",
    script : "./src/server.ts",
    cwd    : "./backend",
    interpreter: "node",
    interpreter_args: "-r ts-node/register",
    env: {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/onboarding_db?schema=public"
    }
  }]
}

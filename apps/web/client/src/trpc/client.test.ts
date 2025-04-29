import { trpcClient } from "./client";

export class TrpcExample {
    async testQuery() {
        try {
            const result = await trpcClient.external.hello.query();
            console.log("Query result:", result);
            return result;
        } catch (error) {
            console.error("Query failed:", error);
            throw error;
        }
    }

    async testMutation() {
        try {
            const result = await trpcClient.csb.start.mutate("test-id");
            console.log("Mutation result:", result);
            return result;
        } catch (error) {
            console.error("Mutation failed:", error);
            throw error;
        }
    }
}

/**
 * Chain-of-Thought Reasoning Logic
 */

/**
 * Builds a prompt to guide the AI's reasoning process.
 * @param {string} message - The user's message/request.
 * @param {string} mode - The reasoning mode ('basic', 'deep', 'reflective').
 * @param {object} context - Additional context for the reasoning process.
 * @returns {string} The constructed reasoning prompt.
 */
function buildReasoningPrompt(message, mode = 'basic', context = {}) {
    let prompt = `Analyze the following request and provide a reasoned response.

**Request:** "${message}"

`;

    switch (mode) {
        case 'deep':
            prompt += `**Reasoning Mode:** Deep Analysis
1.  **Deconstruct:** Break down the request into its fundamental components and goals.
2.  **Identify Constraints:** What are the explicit and implicit constraints or requirements?
3.  **Explore Options:** Brainstorm multiple potential solutions or approaches. Evaluate the pros and cons of each.
4.  **Select & Justify:** Choose the optimal approach and provide a clear justification for your choice.
5.  **Formulate Response:** Construct the final answer based on your analysis.
`;
            break;

        case 'reflective':
            prompt += `**Reasoning Mode:** Reflective
1.  **Initial Thoughts:** What is your immediate reaction or understanding of the request?
2.  **Self-Correction:** Question your initial assumptions. Are there alternative interpretations? What biases might be at play?
3.  **Consider Context:** How does this request relate to past interactions or known user data (e.g., goals, preferences)?
4.  **Synthesize:** Integrate your reflections and the available context to form a comprehensive understanding.
5.  **Final Answer:** Provide a thoughtful and well-rounded response.
`;
            break;

        case 'basic':
        default:
            prompt += `**Reasoning Mode:** Basic
1.  **Goal:** What is the user's primary goal?
2.  **Plan:** Outline the steps to fulfill the request.
3.  **Execution:** Formulate the response based on the plan.
`;
            break;
    }

    if (context && Object.keys(context).length > 0) {
        prompt += `\n**Additional Context to Consider:**\n${JSON.stringify(context, null, 2)}\n`;
    }

    prompt += "\nBegin your reasoning now:\n";

    return prompt;
}

module.exports = {
    buildReasoningPrompt,
};
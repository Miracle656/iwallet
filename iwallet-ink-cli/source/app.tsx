import {useState, useCallback} from 'react';
import {Box, Text, useInput, useApp} from 'ink';
import TextInput from 'ink-text-input';
import OpenAI from 'openai';
import {walletTools, executeTool} from './tools.js';

const client = new OpenAI({
	apiKey: process.env['GROQ_API_KEY'],
	baseURL: 'https://api.groq.com/openai/v1',
});

type Message = {
	role: 'user' | 'assistant' | 'tool';
	content: string;
	toolName?: string;
};

export default function App({name}: {name?: string}) {
	const {exit} = useApp();
	const [messages, setMessages] = useState<Message[]>([
		{
			role: 'assistant',
			content: `Hello, ${
				name || 'Stranger'
			}! iWallet ready. Ask me to check balances, swap, or transfer.`,
		},
	]);
	const [input, setInput] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = useCallback(async () => {
		if (!input.trim() || isLoading) return;

		const userMsg = input.trim();
		setMessages(prev => [...prev, {role: 'user', content: userMsg}]);
		setInput('');
		setIsLoading(true);

		try {
			const response = await client.chat.completions.create({
				model: 'llama-3.3-70b-versatile',
				messages: [
					{
						role: 'system',
						content:
							'You are iWallet, a Sui blockchain assistant. Use the provided tools to help users interact with their wallet and DeepBook.',
					},
					...messages
						.filter(m => m.role !== 'tool')
						.map(m => ({
							role: m.role as 'user' | 'assistant',
							content: m.content,
						})),
					{role: 'user', content: userMsg},
				],
				tools: walletTools,
				tool_choice: 'auto',
			});

			const choice = response.choices[0];
			const message = choice.message;

			if (message.tool_calls && message.tool_calls.length > 0) {
				const toolCall = message.tool_calls[0];
				const toolName = toolCall.function.name;
				const toolArgs = JSON.parse(toolCall.function.arguments);

				setMessages(prev => [
					...prev,
					{
						role: 'tool',
						content: `Executing ${toolName}(${JSON.stringify(toolArgs)})`,
						toolName,
					},
				]);

				const result = await executeTool(toolName, toolArgs);

				const followUp = await client.chat.completions.create({
					model: 'llama-3.3-70b-versatile',
					messages: [
						{
							role: 'system',
							content:
								'You are iWallet. Summarize the tool result for the user.',
						},
						{role: 'user', content: userMsg},
						{
							role: 'assistant',
							content: message.content || '',
							tool_calls: message.tool_calls,
						},
						{
							role: 'tool',
							tool_call_id: toolCall.id,
							content: result,
						},
					],
					tools: walletTools,
				});

				setMessages(prev => [
					...prev,
					{
						role: 'assistant',
						content: followUp.choices[0].message.content || 'Done.',
					},
				]);
			} else {
				setMessages(prev => [
					...prev,
					{
						role: 'assistant',
						content: message.content || 'No response.',
					},
				]);
			}
		} catch (error) {
			setMessages(prev => [
				...prev,
				{
					role: 'assistant',
					content: `Error: ${
						error instanceof Error ? error.message : 'Request failed'
					}`,
				},
			]);
		} finally {
			setIsLoading(false);
		}
	}, [input, isLoading, messages, name]);

	useInput((input, key) => {
		if (key.ctrl && input === 'c') exit();
		if (key.return) handleSubmit();
	});

	return (
		<Box flexDirection="column" height="100%">
			<Box flexDirection="column" flexGrow={1}>
				{messages.map((msg, i) => (
					<Box key={i} marginBottom={1} flexDirection="column">
						<Text
							bold
							color={
								msg.role === 'user'
									? 'blue'
									: msg.role === 'tool'
									? 'yellow'
									: 'green'
							}
						>
							{msg.role === 'user'
								? 'You'
								: msg.role === 'tool'
								? '⚡'
								: 'iWallet'}
							:
						</Text>
						<Text>{msg.content}</Text>
					</Box>
				))}
				{isLoading && <Text color="cyan">Thinking...</Text>}
			</Box>

			<Box borderStyle="single" paddingX={1}>
				<Text bold>{'> '}</Text>
				<TextInput
					value={input}
					onChange={setInput}
					placeholder="e.g., check balance of 0x123..."
				/>
			</Box>
		</Box>
	);
}

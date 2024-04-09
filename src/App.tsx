import React, { useEffect } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import MessageComponent from './components/Message';
import { event, tauri } from '@tauri-apps/api';

type Message = {
	content: string;
	nickname: string;
	timestamp: number;
};

export default function App() {
	const [uname, setUname] = React.useState('');
	const [messages, setMessages] = React.useState<Message[]>([]);
	const [inputValue, setInputValue] = React.useState('');

	useEffect(() => {
		event.listen('plugin:lanchat|receivedMessage', (msg: any) => {
			console.log(msg);

			setMessages((prev) => [...prev, msg.payload]);
		});
	}, []);

	function sendMessage(message: Message) {
		setMessages((prev) => [...prev, message]);
		tauri.invoke('plugin:lanchat|send', { message });
	}

	const chatWindowRef = React.useRef<HTMLDivElement>(null);

	const navigate = useNavigate();

	React.useEffect(() => {
		if (chatWindowRef.current) {
			chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
		}
	}, [messages]);

	return (
		<Routes>
			<Route
				path="/"
				element={
					<div className="p-4 grid justify-center h-dvh w-dvw items-center bg-green-100">
						<div className="bg-green-300 rounded-lg p-2 drop-shadow-2xl">
							<h1 className="text-4xl text-center">Welcome to LanChat!</h1>
							<p className="text-lg text-center">Let's get you set up...</p>
							<input
								type="text"
								name="uname"
								value={uname}
								onChange={(e) => setUname(e.target.value)}
								className="my-2 w-full p-2 rounded-lg bg-green-100"
								placeholder="Enter your display name..."
								onKeyUp={(e) => {
									if (e.key === 'Enter' && uname.trim().length > 0) {
										navigate('/chat');
									}
								}}
							/>
							<Link to={uname.trim().length > 0 ? 'chat' : '/'}>
								<button className="w-full p-2 rounded-lg bg-green-900 text-white">Join the Chat!</button>
							</Link>
						</div>
					</div>
				}
			/>
			<Route
				path="chat/*"
				element={
					<div className="flex flex-col justify-end h-dvh w-dvw bg-green-100 p-2">
						<div className="flex flex-col p-2 w-full overflow-y-auto space-y-2 overscroll-contain" ref={chatWindowRef}>
							{messages.map((message, index) => (
								<MessageComponent
									key={index}
									author={message.nickname}
									content={message.content}
									time={new Date(message.timestamp * 1000)}
								/>
							))}
						</div>
						<hr className="my-1 rounded-xl bg-green-800 h-2" />
						<div className="flex justify-between mt-1 align-bottom">
							<input
								type="text"
								value={inputValue}
								onChange={(e) => setInputValue(e.target.value)}
								onKeyUp={(e) => {
									if (e.key === 'Enter' && inputValue.trim().length > 0) {
										sendMessage({
											content: inputValue,
											nickname: uname,
											timestamp: Math.floor(Date.now() / 1000),
										});
										setInputValue('');
									}
								}}
								className="w-full p-2 rounded-lg bg-green-300 mr-2 drop-shadow-md"
							/>
							<button
								className="p-2 rounded-lg bg-green-900 text-white drop-shadow-md"
								onClick={() => {
									if (inputValue.trim().length > 0) {
										sendMessage({
											content: inputValue,
											nickname: uname,
											timestamp: Math.floor(Date.now() / 1000),
										});
										setInputValue('');
									}
								}}
							>
								Send!
							</button>
						</div>
					</div>
				}
			/>
		</Routes>
	);
}

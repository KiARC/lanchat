import React from 'react';
import { Link, Route, Routes, redirect } from 'react-router-dom';

type Message = {
	author: string;
	content: string;
	time: Date;
};

export default function App() {
	const [uname, setUname] = React.useState('');
	const [messages, setMessages] = React.useState<Message[]>([]);
	const [inputValue, setInputValue] = React.useState('');

	const chatWindowRef = React.useRef<HTMLDivElement>(null);

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
								/>
								<Link to="chat">
									<button className="w-full p-2 rounded-lg bg-green-900 text-white">Join the Chat!</button>
								</Link>
							</div>
						</div>
					}
				/>
				<Route
					path="chat/*"
					element={
						<div className="h-dvh w-dvw bg-green-100 p-2">
							<div className="flex flex-col p-2 w-full h-[90%] overflow-y-auto" ref={chatWindowRef}>
								{messages.map((message, index) => (
									<div key={index} className="p-1 my-1 bg-green-200 rounded-md drop-shadow-sm">
										<p>
											{message.author} ({message.time.getHours()}:{message.time.getMinutes()}:{message.time.getSeconds()}):{' '}
											{message.content}
										</p>
									</div>
								))}
							</div>
							<div className="flex justify-between">
								<input
									type="text"
									value={inputValue}
									onChange={(e) => setInputValue(e.target.value)}
									className="w-full p-2 rounded-lg bg-green-300 mr-2"
								/>
								<button
									className="p-2 rounded-lg bg-green-900 text-white"
									onClick={() => {
										setMessages([
											...messages,
											{
												content: inputValue,
												author: uname,
												time: new Date(),
											} as Message,
										]);
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

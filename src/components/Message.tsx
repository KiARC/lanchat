export default function Message({ author, content, time }: { author: string; content: string; time: Date }) {
	return (
		<div className="bg-green-200 rounded-lg drop-shadow-md max-w-fit">
			<div className="text-left p-">
				<div className=" ml-2 text-sm">
					{author} @ {time.getHours().toString().padStart(2, '0')}:{time.getMinutes().toString().padStart(2, '0')}:
					{time.getSeconds().toString().padStart(2, '0')}
				</div>
			</div>
			<div className="rounded-b-lg break-words p-2 bg-green-300">{content}</div>
		</div>
	);
}

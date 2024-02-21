export default function Message({ author, content, time }: { author: string; content: string; time: Date }) {
	return (
		<div className="p-2 bg-green-200 rounded-md drop-shadow-sm">
			<div className="text-right">
				<p>
					{author} @ {time.getHours().toString().padStart(2, '0')}:{time.getMinutes().toString().padStart(2, '0')}:
					{time.getSeconds().toString().padStart(2, '0')}
				</p>
			</div>
			<p className="">{content}</p>
		</div>
	);
}

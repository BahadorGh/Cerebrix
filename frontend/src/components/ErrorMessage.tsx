interface Props {
  message: string;
}

function ErrorMessage({ message }: Props) {
  return (
    <div className="bg-red-900/30 border border-red-700 text-red-400 p-4 rounded-lg">
      <p className="font-medium">❌ Error</p>
      <p className="text-sm mt-1">{message}</p>
    </div>
  );
}

export default ErrorMessage;
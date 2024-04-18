// A mock function to mimic making an async request for data
export const fetchUser = async () => {
	const response = await fetch('http://localhost:3000/api/user', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
	});
	const result = await response.json();

	return result;
};

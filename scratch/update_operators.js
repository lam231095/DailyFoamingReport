const apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ";
const url = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/users?msnv=in.(02126,04462)";

fetch(url, {
  method: 'PATCH',
  headers: {
    'apikey': apikey,
    'Authorization': 'Bearer ' + apikey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ position: 'Operator' })
})
.then(res => {
  console.log('Status Code:', res.status);
  return res.text();
})
.then(text => {
  console.log('Response:', text);
})
.catch(err => {
  console.error('Error:', err);
});

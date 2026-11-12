const button = document.querySelector('#disclosure');
const details = document.querySelector('#details');

button.addEventListener('click', () => {
  details.hidden = !details.hidden;
  button.setAttribute('aria-expanded', String(!details.hidden));
});

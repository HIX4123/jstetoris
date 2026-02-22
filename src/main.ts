import './styles/main.scss';

const counterButton = document.querySelector<HTMLButtonElement>('#counter');

if (counterButton) {
  let count = 0;
  const updateLabel = () => {
    counterButton.textContent = `count is ${count}`;
  };

  updateLabel();
  counterButton.addEventListener('click', () => {
    count += 1;
    updateLabel();
  });
}

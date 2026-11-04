// Greeting component
/**
 * Renders a greeting
 * @param {string} name - The name to display
 */
function Greeting({ name }) {
  return <h1 className="greeting">Hello, {name}!</h1>;
}

// Arrow component with a fragment
const List = ({ items }) => (
  <>
    {items.map((item) => <li key={item}>{item}</li>)}
  </>
);

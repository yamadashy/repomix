// Arrow function for addition
/** Adds two numbers together
 * @param x First number
 * @param y Second number
 */
const add = (x: number, y: number): number => {
    return x + y;
};
// Function type declaration
let multiply: (a: number, b:number) => number;
multiply = (a, b) => {
    return a*b;
}

// import { Leaf } from 'lucide-react';
// import React from 'react';

import { number } from "framer-motion";

// type User = { name: string };

// const user: User = { name: 'Denis' };
// const Arr: Array[]=[1,2,3,4,5,6,3];
// const[vl1,vl2,vl3]=Arr

// console.log(user.name);
// console.log(vl3);

// type MyObjTtype={a:number,b:string};
// const MyObj: MyObjTtype={a:23,b:'sdsd'};

// console.log(MyObj);

// interface MyFirstInt{
//   a: string,
//   b: number,
//   c: boolean,
//   d: number []
// };

// const IntObj: MyFirstInt={
//   a:'232',
//   b:323,
//   c:true,
//   d:[1,23,4]
// }

// const value=IntObj.a;
// console.log(value);


// const ApiAnswer={key:'1sdsd', key1:'213123'}

// function calculate(method:'add' | 'sub',left:number,right:number):number{
//   switch(method){
//     case 'add': return left + right;
//     case 'sub': return left - right;
//   }
// }
 
// const sum =calculate('sub',2,2);

// console.log(sum);


// const un: unknown='2';

// // Дженерик   generic
// const myArray: MyArray<number> = [1,2,3,4]

// interface MyArray<T>{
//   [n:number]:T

//   map(fn:(el:T,index:number,arr:MyArray<T>)=>U):MyArray<U>
// }

// let variablee=myArray[1];
// let newArr=myArray.map(e=>e+1);
// console.log(newArr);

// function indentity<T>(arg:T):T{
//   return  arg
// }


interface IValueWithType {
  type: string,
  value: T,
  index: T,
}

function withType<U>(arg:U):IValueWithType{
  return{
    type: typeof arg,
    value: arg
  }
}

const res2= withType( 'sdsd');
console.log(res2);




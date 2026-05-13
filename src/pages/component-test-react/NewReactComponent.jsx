import React, { useState } from 'react';
import { Component, Fragment } from 'react';
import styles from '@/pages/component-test-react/NewReactComponent.module.scss'

// const StatusIcon = {
//   online: '🟢',
//   offline: '⚫',
//   away: '🟡'
// }


// const userData = [
//   { id: 1, name: 'Denis', status: 'online', isVarificated: true, skill: ['react', 'js'] },
//   { id: 2, name: 'Anna', status: 'away', isVarificated: true, skill: ['design', 'figma'] },
//   { id: 3, name: 'Alex', status: 'offline', isVarificated: true, skill: ['node', 'mongo'] }
// ];

// class UserCard extends React.Component {
//   render() {
//     const { name, ...rest } = this.props.userData;




//     return (
//       <div className={styles.user__card}>
//         <h2>{name}
//           {rest.isVarificated && '✅' || 'NO'}
//         </h2>
//         <p>Статус: {rest.isVarificated && StatusIcon[rest.status] || StatusIcon.offline}</p>
//         <h3>Навыки:</h3>
//         <ul>{rest.skill.map((e) => (
//           <li key={e}>{e}</li>
//         ))}</ul>
//       </div>
//     );
//   }
// }

// class EmptyPage extends React.Component {
//   render() {
//     return (
//       <div className={styles.ep__header}>
//         <h1 className={styles.ep__title}>Добро пожаловать , здесь новый самостоятельный компонент!</h1>
//         <p style={{ color: '#64748b', marginTop: '12px', paddingBottom: '20px' }}>Здесь происходит настройка стилей</p>
//         <Button className={styles.btn} name="Кнопка" />
//         <div >

//           {userData.map((e) => (
//             <UserCard key={e.id} userData={e} />
//           ))}
//         </div>
//       </div>
//     )
//   }






// }

// // Button
// class Button extends React.Component {
//   render() {
//     return (
//       <button className={styles.btn}>{this.props.name}</button>
//     )
//   }
// };
// export default EmptyPage;

//NewReactComponent
// // Button
function NewReactComponent() {
  const items = [
    'купить',
    'продать',
    'заплатить',
    'выпить',
    'настроить',
  ];
  return (
    <>
      <h1>Галерея изображений:</h1>
      <div style={{ display: 'flex', gap: '20px' }}>
        <Image title='Изображение 1' index='220' weight='200' />
        <Image title='Изображение 2' index='221' />
        <Image title='Изображение 3' index='222' />
        <Button text='Нажми на меня ' />
      </div>
      <ExpandedList />
      <Caulculator a={10} b={20} />
      <TodoList initiallist={items} />
    </>
  )
};
export default NewReactComponent;



// function Image({ index, title, weight = '200' }) {

//   return (
//     <figure style={{ margin: '10px', width: '150px' }}>
//       <img src={GetPicture(index, weight)} alt={title} />
//       <figcaption style={{ paddingTop: '20px' }}><h3>Изображено:<br />{title}</h3></figcaption>
//     </figure>
//   )
// };

function GetPicture(index, weight = '200') {
  return `https://picsum.photos/id/${index}/${weight}/300`
};

class Image extends React.Component {
  constructor(props) {
    super(props);
    this.id = (Math.floor(Math.random() * 100000));
  }
  render(

  ) {
    return (
      <figure style={{ margin: '10px', width: '150px' }} id={this.id}>
        <img src={GetPicture(this.props.index, this.props.weight)} alt={this.props.title} />
        <figcaption style={{ paddingTop: '20px' }}><h3>Изображено:<br />{this.props.title}</h3></figcaption>
      </figure>
    )
  }
}

function Button(props) {
  const [counter, setCounter] = useState(0)
  const [isExpanded, setExpanded] = useState(false);
  return (
    <>
      <button className={styles.btn__test} onClick={() => setCounter(e => e + 1)}>{props.text}</button>
      <p>Кнопка интерактивная. Счет нажатий:{counter} </p>
      <button onClick={() => setCounter(e => e = 0)}>СБРОС</button>
    </>
  )
}

function ExpandedList() {
  const [isExpanded, setExpanded] = useState(false)
  return (
    <Fragment>
      <h2>Секция с паролем</h2>
      <button onClick={() => setExpanded(true)}>Показать пароль</button>
      <button onClick={() => setExpanded(false)}>Спрятать пароль</button>
      {isExpanded &&
        <h3>Пароль: LTYYYTBBFBB</h3>
      }
    </Fragment>
  )
}




const OPERATOR_PLUS = (a, b) => a + b;
const OPERATOR_MINUS = (a, b) => a - b;
const OPERATOR_MULTIPLY = (a, b) => a * b;

function Caulculator({ a, b }) {
  const [operator, setOperator] = useState(() => OPERATOR_PLUS)
  return (
    <main >
      <h1><strong>Рабочий калькулятор</strong></h1>
      <button style={{ margin: '10px', backgroundColor: 'lightblue' }} onClick={() => setOperator(() => OPERATOR_PLUS)}>PLUS</button>
      <button style={{ margin: '10px', backgroundColor: 'lightblue' }} onClick={() => setOperator(() => OPERATOR_MINUS)}>MINUS</button>
      <button style={{ margin: '10px', backgroundColor: 'lightblue' }} onClick={() => setOperator(() => OPERATOR_MULTIPLY)}>Multiply</button>
      <p>Результат данного выражения {a} и {b}: <code>{operator(a, b)}</code> </p>
    </main>

  )
}

function TodoList({ initiallist }) {
  const [todos, setTodos] = useState(initiallist);
  const handleDelete = (indexToDelete) => {
    setTodos(todos.filter((_, index) => index !== indexToDelete));
  };

  return (
    <main>
      {todos.map((todo, index) => (
        <p key={`${todo}-${index}`}>
          {todo}
          <button onClick={() => handleDelete(index)}>
            X
          </button>
        </p>
      ))}
    </main>
  )
};

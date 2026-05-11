import React from 'react';
import { Component, Fragment } from 'react';
// import styles from '@/pages/component-test-react/NewReactComponent.module.scss'

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

  return (
    <>
      <h1>Галерея изображений:</h1>
      <div style={{ display: 'flex', gap: '20px' }}>
        <Image title='Изображение 1' index='220' weight='200' />
        <Image title='Изображение 2' index='221' />
        <Image title='Изображение 3' index='222' />
      </div>
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

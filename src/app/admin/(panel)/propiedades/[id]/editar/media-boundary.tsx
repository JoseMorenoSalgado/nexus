"use client";
import {Component,type ReactNode} from "react";

export default class MediaBoundary extends Component<{children:ReactNode;label:string},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){
  if(!this.state.failed)return this.props.children;
  return <div className="admin-error" role="alert">
   <p>No se pudo mostrar {this.props.label}. Puedes seguir editando los datos de la propiedad.</p>
   <button type="button" className="btn wizard-back" onClick={()=>this.setState({failed:false})}>Reintentar sección</button>
  </div>;
 }
}

import React from 'react'
import { Set } from 'immutable'
import { connect } from "react-redux";
import { Route, Switch } from 'react-router-dom'
import NProgress from 'nprogress'
import dynamic from 'next/dynamic'

import Base from '../../components/Base'
import { call } from '../../util/call'
import Landing from '../Landing'
import { base_url as meta_url } from '../../util/fetch/meta'
import '../../styles/swagger.scss'

import { initializeSigcom } from '../../util/redux/actions'

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false })

const mapStateToProps = state => {
  return { 
    serverSideProps: state.serverSideProps,
  }
};

function mapDispatchToProps(dispatch) {
  return {
    initializeSigcom: serverSideProps => dispatch(initializeSigcom(serverSideProps)),
  };
}

class Home extends React.PureComponent {
  constructor(props) {
    super(props)
    this.state = {
      cart: Set(),
    }
  }

  componentDidMount = async () => {
    
  }

  // signature_search = (props) => (
  //   <SignatureSearch
  //     cart={this.state.cart}
  //     updateCart={this.updateCart}
  //     signature_keys={this.props.signature_keys}
  //     libraries={this.props.libraries}
  //     resources={this.props.resources}
  //     library_resource={this.props.library_resource}
  //     ui_values={this.props.ui_values}
  //     schemas={this.props.schemas}
  //     handleChange={this.handleChange}
  //     changeSignatureType={this.changeSignatureType}
  //     updateSignatureInput={this.updateSignatureInput}
  //     resetAllSearches={this.resetAllSearches}
  //     submit={this.submit}
  //     {...props}
  //     {...this.state.signature_search}
  //   />
  // )

  // metadata_search = (props) => (
  //   <MetadataSearch
  //     cart={this.state.cart}
  //     updateCart={this.updateCart}
  //     ui_values={this.props.ui_values}
  //     schemas={this.props.schemas}
  //     currentSearchArrayChange={this.currentSearchArrayChange}
  //     performSearch={this.performSearch}
  //     handleChange={this.handleChange}
  //     resetAllSearches={this.resetAllSearches}
  //     submit={this.submit}
  //     {...props}
  //     {...this.state.metadata_search}
  //   />
  // )

  resources = (props) => (
    <Resources
      {...props}
    />
  )

  // upload = (props) => (
  //   <Upload
  //     cart={this.state.cart}
  //     updateCart={this.updateCart}
  //     {...props}
  //   />
  // )

  // api = (props) => (
  //   <SwaggerUI
  //     url={`${meta_url}/openapi.json`}
  //     deepLinking={true}
  //     displayOperationId={true}
  //     filter={true}
  //   />
  // )

  // collection = (props) => (
  //   <Collection
  //     ui_values={this.props.ui_values}
  //     {...props}
  //   />
  // )

  landing = (props) => (
    <Landing 
      {...props}
    />
    )

  render = () => {
    if (this.props.serverSideProps===null){
      return (<span>Loading...</span>)
    }else {
      return (<span>Loaded</span>)
    }
    // return (
    //   <Base ui_values={this.props.ui_values}
    //     handleChange={this.handleChange}
    //   >
    //     <style jsx>{`
    //     #Home {
    //       background-image: url('${process.env.PREFIX}/static/images/arrowbackground.png');
    //       background-attachment: fixed;
    //       background-repeat: no-repeat;
    //       background-position: left bottom;
    //     }
    //     `}</style>
    //     <Switch>
    //       <Route
    //         exact path="/"
    //         component={this.landing}
    //       />
    //       {this.props.ui_values.nav.resources ?
    //         <Route
    //           path={`/${this.props.ui_values.preferred_name.resources || 'Resources'}`}
    //           component={this.resources}
    //         /> : null
    //       }
    //       <Route
    //         path="/API"
    //         component={this.api}
    //       />
    //     </Switch>
    //   </Base>
    // )
  }
}
const options = {
  forwardRef : true
}
export default connect(mapStateToProps, mapDispatchToProps, null, options )(Home)
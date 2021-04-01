import React from 'react'
import { Link } from 'react-router-dom'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'
import Button from '@material-ui/core/Button'
import { withStyles } from '@material-ui/core/styles'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import Breadcrumbs from '@material-ui/core/Breadcrumbs'
import Hidden from '@material-ui/core/Hidden'
import SwipeableDrawer from '@material-ui/core/SwipeableDrawer'
import MenuIcon from '@material-ui/icons/Menu'
import { makeTemplate } from '../../util/ui/makeTemplate'

const styles = (theme) => ({
  grow: {
    flexGrow: 1,
  },
  header: {
    whiteSpace: 'nowrap',
    color: 'inherit',
  },
  breadcrumb: {
    whiteSpace: 'nowrap',
    color: 'inherit',
  },
  link: {
    color: 'inherit',
  },
  menuItem: {
    color: 'inherit',
    paddingLeft: 17,
    paddingRight: 17
  },
  paper: {
    padding: `${theme.spacing(1)}px ${theme.spacing(2)}px`,
  },
  menuButton: {
    margin: 0,
  },
})

export const ListItemLink = (props) => {
  return <ListItem button component="a" {...props} />
}

export function Nav(props) {
  const { ui_values, location, classes } = props
  const search_tab_list = ui_values.nav.MetadataSearch.landing ? ['MetadataSearch', 'SignatureSearch']: ['SignatureSearch', 'MetadataSearch']
  return (
    <React.Fragment>
      {ui_values.nav[search_tab_list[0]].active ?
        <ListItemLink
          selected={location.pathname === `${ui_values.nav[search_tab_list[0]].endpoint}`}
          className={classes.menuItem}
          href={`#${ui_values.nav[search_tab_list[0]].endpoint}`}
        >
          <Typography variant={"h5"}>
            {ui_values.nav[search_tab_list[0]].navName || ui_values.nav[search_tab_list[0]].endpoint.substring(1).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ')}
          </Typography>
        </ListItemLink> : null
      }
      {ui_values.nav[search_tab_list[1]].active ?
        <ListItemLink
          selected={location.pathname === `${ui_values.nav[search_tab_list[1]].endpoint}`}
          className={ classes.menuItem}
          href={`#${ui_values.nav[search_tab_list[1]].endpoint}`}
        >
          <Typography variant={"h5"}>
            {ui_values.nav[search_tab_list[1]].navName || ui_values.nav[search_tab_list[1]].endpoint.substring(1).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ')}
          </Typography>
        </ListItemLink> : null
      }
      {ui_values.nav.Resources.active ?
        <ListItemLink
          selected={location.pathname === `${ui_values.nav.Resources.endpoint || '/Resources'}`}
          className={ classes.menuItem}
          href={`#${ui_values.nav.Resources.endpoint}`}
        >
          <Typography variant={"h5"}>
            {ui_values.nav.Resources.navName || ui_values.nav.Resources.endpoint.substring(1).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ')}
          </Typography>
        </ListItemLink> : null
      }
      {ui_values.extraNav.map(nav=>{
        if (nav.type === 'external') {
          return (
            <ListItemLink
              className={ classes.menuItem}
              href={nav.endpoint}
              target = "_blank" 
              rel = "noopener noreferrer"
              key={nav.navName}
            >
                <Typography variant={"h5"}>
                  {nav.navName}
                </Typography>
            </ListItemLink>
          )
        }else {
          return (
            <ListItemLink
              className={ classes.menuItem}
              href={`#${nav.endpoint}`}
              key={nav.navName}
            >
              <Typography variant={"h5"}>
                {nav.navName}
              </Typography>
            </ListItemLink>
          )
        }
      }
      )}
      <ListItemLink
        selected={location.pathname === '/API'}
        className={ classes.menuItem}
        href={'#/API'}
      >
         <Typography variant={"h5"}>
            API
          </Typography>
      </ListItemLink>
      <ListItemLink
        selected={location.pathname === '/About'}
        className={ classes.menuItem}
        href={'#/About'}
      >
         <Typography variant={"h5"}>
            About
          </Typography>
      </ListItemLink>
    </React.Fragment>
  )
}

class Header extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      open: false,
    }
  }

  toggleDrawer = () => {
    this.setState((prevState) => ({
      open: !prevState.open,
    }))
  };

  render = () => {
    const paths = this.props.location.pathname.split('/')
    const { staticContext, classes, ...rest } = this.props
    return (
      <header {...this.props.ui_values.header_info.header_props}>
        <AppBar position="static" color="primary" style={{height: 80, paddingTop: 5, paddingBottom: 5}}>
          <Toolbar>
            <Hidden mdDown>
              <Typography variant="h4" color="inherit" className={classes.grow}>
                <Link
                  to="/"
                  className={classes.header}
                >
                  {this.props.ui_values.header_info.header_left}<img {...this.props.ui_values.header_info.icon} src={makeTemplate(this.props.ui_values.header_info.icon.src, {})} />{this.props.ui_values.header_info.header_right}
                </Link>
              </Typography>
              <List
                {...this.props.ui_values.header_info.menu_props}
              >
                <Nav classes={classes} {...rest}/>
              </List>
            </Hidden>
            <Hidden lgUp>
              <Typography variant={this.props.ui_values.header_info.variant || 'h4'} color="inherit" className={classes.grow}>
                <Link
                  to="/"
                  className={classes.header}
                >
                  {this.props.ui_values.header_info.header_left}<img {...this.props.ui_values.header_info.icon} src={makeTemplate(this.props.ui_values.header_info.icon.src, {})} />{this.props.ui_values.header_info.header_right}
                </Link>
              </Typography>
              <Button edge="start" className={classes.menuButton} onClick={this.toggleDrawer} color="inherit" aria-label="menu">
                <MenuIcon />
              </Button>
              <SwipeableDrawer
                open={this.state.open}
                onClose={this.toggleDrawer}
                onOpen={this.toggleDrawer}
              >
                <div
                  tabIndex={0}
                  role="button"
                  onClick={this.toggleDrawer}
                  onKeyDown={this.toggleDrawer}
                >
                  <List disablePadding>
                    <Nav classes={classes} {...rest}/>
                  </List>
                </div>
              </SwipeableDrawer>
            </Hidden>
          </Toolbar>
        </AppBar>
        {paths.length <= 3 ? <div style={{height:30}}/> : (
            <Breadcrumbs separator={<span className="mdi mdi-arrow-right-bold-circle-outline"/>}
              aria-label="breadcrumb"
              component={'div'}
              style={{
                paddingLeft: 15,
                height: 30,
              }}>
              {paths.slice(1).map((path, i) => {
                const href = paths.slice(0, i + 2).join('/')
                return (
                  <Typography color={'inherit'} key={href} variant={"caption"}>
                    <Link
                      key={href}
                      to={href}
                      className={classes.breadcrumb}
                    >
                      {path.replace(/_/g, ' ')}
                    </Link>
                  </Typography>
                )
              })}
            </Breadcrumbs>
        )}
      </header>
    )
  }
}


export default withStyles(styles)(Header)

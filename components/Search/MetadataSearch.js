import React from 'react'
import {build_where} from '../../connector'
import CircularProgress from '@material-ui/core/CircularProgress'
import { labelGenerator, getName } from '../../util/ui/labelGenerator'
import PropTypes from 'prop-types'
import { MetadataSearchComponent } from './MetadataSearchComponent'
import { get_filter, resolve_ids, download_signature } from './utils'
import Downloads from '../Downloads'
import Options from './Options'
import { getSearchFilters } from '../../util/ui/fetch_ui_props'
import Insignia from '../../standalone/fairshake-insignia/src'

export default class MetadataSearch extends React.PureComponent {
	constructor(props){
		super(props)
		this.state = {
			search_terms: [],
			entries: null,
			page: 0,
			perPage: 10,
			query: {skip:0, limit:10},
			filters: {},
			paginate: false,
			searching: false,
			processing: false
		}
	}

	download = (props) => {
		return <Downloads {...props}/>
	}

	insignia = (props) => {
		return <Insignia {...props}/>
	}

	options = (props) => {
		return <Options {...props}/>
	}

	

	process_search = async () => {
		try {
			this.props.resolver.abort_controller()
			this.props.resolver.controller()
			const {schemas} = this.props
			const {search: filter_string} = this.props.location
			const query = get_filter(filter_string)
			const resolved_query = resolve_ids({
				query,
				model: this.props.model,
				...this.props.resource_libraries
			})
			const where = build_where(resolved_query)
			const {limit=10, skip=0, order} = query
			// const skip = limit*page
			const filter = {
				limit, skip, order
			}
			if (where) filter["where"] = where
			const {entries: results, count} = await this.props.resolver.filter_metadata({
				model: this.props.model,
				filter,
			})
			
			const entries = []
			for (const c of Object.values(results)){
				const entry = await c.serialize(true,false)
				const e = labelGenerator(await entry,
					schemas,
					"#" + this.props.preferred_name[this.props.model] +"/")
				e.RightComponents = []
				if (this.props.model==='signatures'){
					const type = entry.library.dataset_type === "rank_matrix" ? "Rank": "Overlap"
					e.RightComponents.push({
						component: this.options,
						props: {
							options: [
								{
									label: `Perform ${this.props.preferred_name_singular.signatures} Enrichment Analysis`,
									icon: 'mdi-magnify-scan',
									href: `#${this.props.nav.SignatureSearch.endpoint}/${type}/${e.data.id}`
								},
								{
									label: `Download ${this.props.preferred_name.signatures}`,
									onClick: () => {
										download_signature({
											entry,
											schemas,
											filename: `${e.info.name.text}.txt`,
											resolver: this.props.resolver,
											model: this.props.model,
										})
									},
									icon: "mdi-download"
								}
							]
						}
					})
				}
				if (e.info.components.insignia !== undefined) {
					e.RightComponents.push({
						component: this.insignia,
						props: {...e.info.components.insignia.props}
					})
				} 
				if (e.info.components.download !== undefined) {
					e.RightComponents.push({
						component: this.download,
						props: {...e.info.components.download.props}
					})
				}
				entries.push(e)
			}

			const model_tab_props = this.get_model_tab_props(count)
			
			if (!this.state.paginate) this.get_value_count(where, query)
			this.setState({
				count,
				entries,
				page: skip/limit,
				perPage: limit,
				query,
				searching: false,
				paginate: false,
				model_tab_props,
			})	
		} catch (error) {
			this.props.resolver.abort_controller()
			console.error(error)
		}
	}

	get_value_count = async (where, query) =>{
		try {
			this.props.resolver.abort_controller()
			this.props.resolver.controller()
			const filter_fields = {}
			const fields = []
			const {lib_id_to_name, resource_id_to_name} = this.props.resource_libraries
			for (const prop of this.state.filter_props[this.props.model]){
				if (prop.type === "filter"){
					const checked = {}
					const filters = query.filters || {}
					if (filters[prop.field]){
						for (const i of filters[prop.field]){
							checked[i] = true
						}
					}
					filter_fields[prop.field] = {
						name: prop.text,
						field: prop.field,
						search_field: prop.search_field || prop.field,
						checked: checked,
						priority: prop.priority,
						icon: prop.icon,
					}
					if (this.props.model !== "signatures" || prop.field !== "resource")
						fields.push(prop.field)
				}
			}
			if (fields.length > 0){
				const value_count = await this.props.resolver.aggregate(
					`/${this.props.model}/value_count`, 
					{
						where,
						fields,
						limit: 20,
					})
				const filters = {}
				for (const [field, values] of Object.entries(value_count)){
					if (field === "library"){
						filters[field] = {
							...filter_fields[field],
							values: Object.entries(values).reduce((acc, [id, count])=> {
								acc[lib_id_to_name[id]] = count
								return acc
							},{})
						}
						if (filter_fields.resource !== undefined){
							// resolve resources
							const {lib_to_resource} = this.props.resource_libraries
							const vals = {}
							for (const [k,v] of Object.entries(values)){
								const resource = lib_to_resource[k]
								if (vals[resource_id_to_name[resource]] === undefined){
									vals[resource_id_to_name[resource]] = v
								}
								else {
									vals[resource_id_to_name[resource]] = vals[resource_id_to_name[resource]] + v
								}
							}
							filters["resource"] = {
								...filter_fields["resource"],
								values: vals,
							}
						}
					} else if(field === "resource"){
						filters[field] = {
							...filter_fields[field],
							values: Object.entries(values).reduce((acc, [id, count])=> {
								acc[resource_id_to_name[id]] = count
								return acc
							},{})
						}
					}else {
						filters[field] = {
							...filter_fields[field],
							values
						}
					}
					
				}
				this.setState({
					filters
				})
			}
		} catch (error) {
			this.props.resolver.abort_controller()
			console.error(error)
		}
	}

	onSearch = (search) => {
		const query = {
			...this.state.query,
			search
		}
		this.setState({
			query,
			searching: true,
		}, ()=>{
			this.props.history.push({
				pathname: this.props.location.pathname,
				search: `?query=${JSON.stringify(query)}`,
			})
		})
	}

	onClickFilter = (field, value) => {
		const {filters, query} = this.state
		const checked = (filters[field] || {}).checked || {} 
		checked[value] = checked[value] === undefined? true: !checked[value]
		query.filters = {
			...query.filters,
			[field]: Object.keys(checked).filter(k=>checked[k])
		}
		this.props.history.push({
			pathname: this.props.location.pathname,
			search: `?query=${JSON.stringify(query)}`,
			})
	}

	paginate = async (limit, skip) => {
		const query = {
			...this.state.query,
			limit,
			skip
		}
		
		this.props.history.push({
			pathname: this.props.location.pathname,
			search: `?query=${JSON.stringify(query)}`,
			state: {
				paginate: true
			}
		  })
	}

	handleChangePage = async (event, page) => {
		const { perPage:limit } = this.state
		const skip = limit*page
		await this.paginate(limit, skip)
	}

	handleChangeRowsPerPage = async (e) => {
		const { page } = this.state
		const limit = e.target.value
		const skip = limit*page
		await this.paginate(limit, skip)
	}

	handleTabChange = (v) => {
		this.props.history.push({
			pathname: v.href,
		})
	}

	get_model_tab_props = (count=null) => {
		const model_props = []
		for (const model of this.props.model_tabs){
			const preferred_name = this.props.preferred_name[model]
			if (preferred_name!==undefined && count !== null){
				const endpoint = this.props.nav.MetadataSearch.endpoint
				let label
				if (this.props.model === model) label = `${preferred_name} (${count})`
				else label = this.props.preferred_name[model]
				model_props.push({
					label,
					href: `${endpoint}/${this.props.preferred_name[model]}`,
					value: this.props.preferred_name[model],
				})
			}
		}
		return model_props
	}

	componentDidMount = async () => {
		const filter_props = await getSearchFilters()
		const model_tab_props = this.get_model_tab_props()
		const search_tabs = []
		for (const k of ['MetadataSearch', 'SignatureSearch']){
			const v = this.props.nav[k]
			if (v.active){
				search_tabs.push({
					label: v.navName,
					href:  v.endpoint,
					value: v.navName,
				})
			}
		}

		this.setState({
			searching: true,
			model_tab_props,
			search_tabs,
			filter_props,
			homepage: this.props.location.search === ""
		}, ()=>{
			if (this.props.location.search !== ""){
				this.process_search()
			}
		})	
	}

	componentDidUpdate = (prevProps) => {
		const prev_search = decodeURI(prevProps.location.search)
		const curr_search = decodeURI(this.props.location.search)
		if (prevProps.model !== this.props.model || prev_search !== curr_search){
			this.setState(prevState=>{
				return {
					searching: true,
					paginate: (this.props.location.state || {}).paginate ? true: false,
					filters: (this.props.location.state || {}).paginate ? prevState.filters: {},
					homepage: false,
				}
			}, ()=>{
				this.process_search()
			})
		}
	}

	render = () => {
		if (this.state.search_tabs==undefined){
			return <CircularProgress />
		}
		return (
			<MetadataSearchComponent
					searching={this.state.searching}
					homepage={this.state.homepage}
					placeholder={this.props.placeholder}
					about={this.props.about}
					search_terms={this.state.query.search || []}
					search_examples={this.props.search_examples}
					filters={Object.values(this.state.filters)}
					onSearch={this.onSearch}
					onFilter={this.onClickFilter}
					entries={this.state.entries}
					DataTableProps={{
						onChipClick: v=>{
							if (v.clickable) this.onClickFilter(v.field, v.text)
						}
					}}
					DataTableProps={{
						onChipClick: v=>{
							if (v.clickable) this.onClickFilter(v.field, v.text)
						}
					}}
					PaginationProps={{
						page: this.state.page,
						rowsPerPage: this.state.perPage,
						count:  this.state.count,
						onChangePage: (event, page) => this.handleChangePage(event, page),
						onChangeRowsPerPage: this.handleChangeRowsPerPage,
					}}
					ModelTabProps={{
						tabs: this.state.model_tab_props,
						value: this.props.preferred_name[this.props.model],
						handleChange: this.handleTabChange,
						tabsProps:{
							centered: true,
						}
					}}
					SearchTabProps={{
						tabs: this.state.search_tabs,
						value:"Metadata Search",
						tabsProps:{
							centered: true,
						},
						handleChange: this.handleTabChange
					}}
				/>
		)
	}

	
}

MetadataSearch.propTypes = {
	nav: PropTypes.shape({
		MetadataSearch: PropTypes.shape({
			endpoint: PropTypes.string
		}),
		SignatureSearch: PropTypes.shape({
			endpoint: PropTypes.string
		}),
	}).isRequired,
	model: PropTypes.string.isRequired,
	model_tabs: PropTypes.arrayOf(PropTypes.oneOf(["resources", "libraries", "signatures", "entities"])),
	schemas: PropTypes.array.isRequired,
	preferred_name: PropTypes.shape({
		resources: PropTypes.string,
		libraries: PropTypes.string,
		signatures: PropTypes.string,
		entities: PropTypes.string,
	}),
	topComponents: PropTypes.func,
	middleComponents: PropTypes.func,
	bottomComponents: PropTypes.func,
	resource_libraries: PropTypes.shape({
		lib_id_to_name: PropTypes.objectOf(PropTypes.string),
		lib_name_to_id: PropTypes.objectOf(PropTypes.string),
		resource_id_to_name: PropTypes.objectOf(PropTypes.string),
		resource_name_to_id: PropTypes.objectOf(PropTypes.string),
		lib_to_resource: PropTypes.objectOf(PropTypes.string),
		resource_to_lib: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string)),
	}),
	about: PropTypes.string,
}

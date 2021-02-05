import React from 'react'
import Grid from '@material-ui/core/Grid'
import Collapse from '@material-ui/core/Collapse'
import Tooltip from '@material-ui/core/Tooltip'
import Card from '@material-ui/core/Card'
import CardContent from '@material-ui/core/CardContent'
import CardMedia from '@material-ui/core/CardMedia'
import {ShowMeta} from '../DataTable'
import {build_where} from '../../connector'
import CircularProgress from '@material-ui/core/CircularProgress'
import { labelGenerator, getName } from '../../util/ui/labelGenerator'
import PropTypes from 'prop-types'
import IconButton from '../IconButton'
import Typography from '@material-ui/core/Typography';
import Link from '@material-ui/core/Link';
import Button from '@material-ui/core/Button'
import { SearchResult } from './SearchResult'
import { get_filter,
	resolve_ids,
	get_signature_entities,
	create_query,
	enrichment,
	download_signature,
	get_data_for_bar_chart
 } from '../Search/utils'
import ScorePopper from '../ScorePopper'
import Downloads from '../Downloads'
import {EnrichmentBar} from './EnrichmentBar'
import {ScatterPlot} from './ScatterPlot'
import Lazy from '../Lazy'

const id_mapper = {
	resources: "resource_id",
	libraries: "library_id",
	signatures: "signature_id",
}

export default class EnrichmentPage extends React.PureComponent {
	constructor(props){
		super(props)
		this.state = {
			search_terms: [],
			entry: null,
			page: 0,
			perPage: 10,
			metaTab: "metadata",
			query: {skip:0, limit:10},
			filters: {},
			paginate: false,
			visualization: "bar",
			visualize: false,
			expanded: false,
		}
	}

	handleExpandClick = () => {
		this.setState(prevState=>({
			expanded: !prevState.expanded,
		}));
	  }

	process_entry = async () => {
		try {
			this.props.resolver.abort_controller()
			this.props.resolver.controller()

			const { type, model_name, enrichment_id, id } = this.props.match.params
			const { lib_to_resource, resource_to_lib } = this.props.resource_libraries
			const {model, schemas} = this.props
			
			await this.process_enrichment_id()
			
			const entry_object = await this.props.resolver.resolve_enrichment({
				enrichment_id,
				[id_mapper[model]]: id,
				lib_to_resource,
				resource_to_lib,
			})
			let order_field, order
			if (entry_object.child_model === "signatures"){
				order_field = 'p-value'
				order = 'ASC'
			}else if (entry_object.child_model !== "entities"){
				order_field = 'signature_count'
				order = 'DESC'
			}
			const entry = labelGenerator(await entry_object.serialize(entry_object.model==='signatures', false), schemas,
										`#/Enrichment/${type}/${enrichment_id}/${model_name}/id`)
			const parent = labelGenerator(await entry_object.parent(), schemas, 
										`#/Enrichment/${type}/${enrichment_id}/${this.props.preferred_name[entry_object.parent_model]}/`)
			await entry_object.create_search_index(entry.schema, entry_object.child_model==='signatures')
			this.setState({
				entry_object,
				entry,
				parent,
				order_field,
				order
			}, ()=> {
				this.process_children()
			})	
		} catch (error) {
			console.error(error)
		}
	}

	process_enrichment_id = async () => {
		try {
			const { type, model_name, enrichment_id, id } = this.props.match.params
			const e = this.props.resolver.get_enrichment(enrichment_id)
			if (e === undefined) {
				// try if it is a signature
				const input = await get_signature_entities(enrichment_id, this.props.resolver, this.props.schemas, this.handleError)
				if (input === null) throw new Error("Invalid Enrichment ID")
				const query = create_query(input, enrichment_id)
				// TODO: Enrichment should only be done on the library it belongs to
				await enrichment(query, input, this.props.resolver, this.handleError)
			}
		} catch (error) {
			console.error(error)
		}
	}

	process_children = async () => {
		try {
			this.props.resolver.abort_controller()
			this.props.resolver.controller()
			const {schemas} = this.props
			const { type, enrichment_id } = this.props.match.params
			const {entry_object} = this.state
			const {search: filter_string} = this.props.location
			const query = get_filter(filter_string)
			const {limit= 10,
				skip= 0,
				order= [this.state.order_field, this.state.order],
				} = query
			const final_query = {
				limit, skip, order,
				search: query.search
			}
			const children_object = await this.state.entry_object.children(final_query)
			const children_count = children_object.count
			const children_results = children_object[this.state.entry_object.child_model]
			const children = []
			for (const entry of Object.values(children_results)){
				let e
				if (entry_object.child_model!=="entities"){
					e = labelGenerator(entry,
						schemas,
						`#/Enrichment/${type}/${enrichment_id}/${this.props.preferred_name[entry_object.child_model]}/`)
				}else {
					e = labelGenerator(entry, schemas)
				}
				e["RightComponents"] = []
				if (entry.scores !== undefined && entry.scores.signature_count !== undefined){
					e["RightComponents"].push({
						component: this.score_popper,
						props: {
							scores: Object.entries(entry.scores).reduce((acc,[label,value])=>({
								...acc,
								[label]: {
									label: label.replace(/_/,' '),
									value, 
								}
							}), {}),								
							GridProps: {
								style: {
									textAlign: "right",
									marginRight: 5
								}
							}
						}
					})
				}
				if (entry_object.child_model==='signatures'){
					e.RightComponents.push({
						component: this.downloads,
						props: {
							data: [
								{
									text: `Download Overlaps`,
									onClick: () => {
										download_signature({
											entry,
											schemas,
											filename: `${e.info.name.text}.txt`,
											resolver: this.props.resolver,
											model: entry_object.child_model,
										})
									},
									icon: "mdi-download"
								}
							]
						}
					})
				}	
				children.push(e)
			}
			// if (!this.state.paginate) this.get_value_count(where, query)
			this.setState({
				children_count,
				children,
				page: skip/limit,
				perPage: limit,
				query,
				searching: false,
				paginate: false,
				visualize: entry_object.child_model === 'signatures',
				tab: this.props.label || Object.keys(children_count)[0],
			})	
		} catch (error) {
			console.error(error)
		}
			
	}


	get_value_count = async (where, query) =>{
		try {
			const filter_fields = {}
			const fields = []
			const {lib_id_to_name, resource_id_to_name, lib_to_resource} = this.props.resource_libraries
			// const resource_lib = {}
			// let resource_prop
			for (const prop of Object.values(this.state.entry.schema.properties)){
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
					if (this.state.entry_object.child_model !== "signatures" || prop.field !== "resource")
						fields.push(prop.field)
				}
			}
			if (fields.length > 0){
				const value_count = await this.props.resolver.aggregate_post({
					endpoint: `/${this.state.entry_object.model}/${this.state.entry_object.id}/${this.state.entry_object.child_model}/value_count`, 
					filter: {
						where,
						fields,
						limit: 20,
					}
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
			console.error(error)
		}
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

	handleError = (error) => {
		this.setState({
			error: error.message
		})
	}

	downloads = (props) => {
		return <Downloads {...props}/>
	}

	componentDidMount = () => {
		this.setState(prevState=>({
			searching: true,
			resolver: this.props.resolver !== undefined ? this.props.resolver: new DataResolver(),
			children: undefined
		}), ()=>{
			this.process_entry()
		})	
	}

	score_popper = (props) => {
		return <ScorePopper {...props} sortBy={this.sortBy}/>
	}
	
	sortBy = (order_field) => {
		this.setState(prevProps=>({
			order_field,
			order: order_field === 'odds ratio' ? 'DESC': 'ASC',
			visualize: false,
			searching: true,
		}), ()=>{
			this.process_children()
		})
	}

	componentDidUpdate = (prevProps, prevState) => {
		const prev_search = decodeURI(prevProps.location.search)
		const curr_search = decodeURI(this.props.location.search)
		if (prevProps.match.params.id !== this.props.match.params.id){
			this.setState({
				searching: true,
				filters: {},
				visualize: false,
				paginate: (this.props.location.state || {}).paginate ? true: false
			}, ()=>{
				this.process_entry()
			})
		} else if (prev_search !== curr_search){
			this.setState({
				searching: true,
				paginate: (this.props.location.state || {}).paginate ? true: false
			}, ()=>{
				this.process_children()
			})
		}
	}

	handleTabChange = (event, tab) => {
		this.setState({
			tab
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

	onSearch = (search) => {
		const query = {
			...this.state.query,
			search,
			skip: 0
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

	ChildComponent = () => {
		if (this.state.children_count === undefined) return <CircularProgress />
		const tabs = Object.entries(this.state.children_count).map(([k,count])=>{
			const label = this.props.preferred_name[k] || k
			return {
				label,
				href: this.props.location.pathname + `/${label}`,
				count,
				value: k
			}
		})
		return(
			<React.Fragment>
				<SearchResult
					searching={this.state.searching}
					search_terms={this.state.query.search || []}
					search_examples={[]}
					filters={Object.values(this.state.filters)}
					onSearch={this.onSearch}
					onFilter={this.onClickFilter}
					entries={this.state.children}
					DataTableProps={{
						onChipClick: v=>{
							if (v.field.includes('scores.')) this.sortBy(v.field.replace('scores.',''))
						}
					}}
					PaginationProps={{
						page: this.state.page,
						rowsPerPage: this.state.perPage,
						count:  this.state.children_count[this.state.tab],
						onChangePage: (event, page) => this.handleChangePage(event, page),
						onChangeRowsPerPage: this.handleChangeRowsPerPage,
					}}
					TabProps={{
						tabs,
						value:this.state.tab,
						handleChange:this.handleTabChange,
						tabsProps:{
							centered: true
						},
					}}
					schema={this.state.entry.schema}
				/>
			</React.Fragment>
		)
	}

	pageTitle = () => {
		if (this.state.parent === undefined)
			return (
				<React.Fragment>
					<Typography variant="h4">
						{this.state.entry.info.name.text}
					</Typography>
					
				</React.Fragment>
			)
		const endpoint = this.state.parent.info.endpoint 
		return(
			<React.Fragment>
				<Typography variant="h4">
					{this.state.entry.info.name.text}
				</Typography>
				<Typography variant="h5" gutterBottom>
					<Link href={endpoint}>
						{this.state.parent.info.name.text}
					</Link>
				</Typography>
			</React.Fragment>
		)
	}

	handleMetaTabChange = (event, metaTab) => {
		this.setState({
			metaTab
		})
	}

	metaTab = () => {
		const entry = this.state.entry
		return (
			<ShowMeta
				value={{...entry.data.meta, ...entry.data.scores}}
			/>
		)
	}

	enrichment_bar = () => {
		const {
			barColor="#0063ff",
			inactiveColor="#713939"
		} = this.props
		const data= get_data_for_bar_chart({
			entries: this.state.children,
			barColor,
			inactiveColor,
			order: this.state.order,
			order_field: this.state.order_field,
		})
		const score_fields = Object.keys(this.state.children[0].data.scores).filter(s=>s!=="setsize")
		return (
			<React.Fragment>
				<EnrichmentBar data={data} field={this.state.order_field} fontColor={"#FFF"} 
					barProps={{isAnimationActive:false}}
					barChartProps={{
						onClick: () => {
							const new_index = (score_fields.indexOf(this.state.order_field) + 1)%score_fields.length
							const new_field = score_fields[new_index]
							this.sortBy(new_field)
						}
					}}/>
				<Typography>Click the bars to sort. Now sorted by {this.state.order_field}.</Typography>
			</React.Fragment>
		)
	}

	scatter_plot = async () => {
		const {
			scatterColor="#0063ff",
			inactiveColor="#713939"
		} = this.props
		const {signatures} = await this.state.entry_object.children({limit:0})
		const data = signatures.map(s=>({
			name: getName(s, this.props.schemas),
			id: s.id,
			oddsratio: s.scores["odds ratio"],
			logpval: -Math.log(s.scores["p-value"]),
			pval: s.scores["p-value"], 
			color: s.scores["p-value"] < 0.05 ? scatterColor: inactiveColor,
		}))
		return (
			<React.Fragment>
				<ScatterPlot data={data} color={scatterColor} scatterProps={{onClick: (v) => {
					const {type, enrichment_id} = this.props.match.params
					const model = this.props.preferred_name[this.state.entry_object.child_model]
					const id = v.id
					this.props.history.push({
						pathname: `/Enrichment/${type}/${enrichment_id}/${model}/${id}`,
					})
				}}}/>
				<Typography>Click on a node to explore a {this.props.preferred_name_singular.signatures}.</Typography>
			</React.Fragment>
		)
	}


	visualizations = () => {
		if (this.state.searching) return <CircularProgress/>
		if (!this.state.visualize) return null
		return (
			<Grid container spacing={1}>
				<Grid item xs={12} align="right">
					
				</Grid>
				<Grid item xs={12} align="center">
					{this.state.visualization==="bar" ? this.enrichment_bar(): 
						<Lazy>{async () => this.scatter_plot()}</Lazy>
					}
				</Grid>
			</Grid>
		) 
	}

	render = () => {
		if (this.state.entry==null){
			return <CircularProgress />
		}
		return(
			<Grid container spacing={3}>
				{this.props.topComponents!==undefined ? 
					<Grid item xs={12}>
						{this.props.topComponents()}
					</Grid> : null}
				<Grid item xs={12}>
					<Card>
						<CardContent>
							<Grid container spacing={3}>
								<Grid item md={2} xs={4}>
									<CardMedia style={{ marginTop: -15, paddingLeft: 13 }}>
										<IconButton
											{...(this.state.entry.info.icon || {})}
										/>
									</CardMedia>
								</Grid>
								<Grid item md={10} xs={8}>
									<Grid container spacing={1}>
										<Grid item xs={9}>
											{ this.pageTitle() }
										</Grid>
										<Grid item xs={3} align="right">
											{this.state.visualize ?
												<React.Fragment>
													<Tooltip title={'Bar Chart'}>
														<Button
															color="primary"
															disabled={this.state.visualization==="bar"}
															onClick={()=>this.setState({visualization: "bar"})}
														>
															<span className="mdi mdi-chart-bar mdi-24px"/>
														</Button>
													</Tooltip>
													<Tooltip title={'Scatter Plot'}>
														<Button
															color="primary"
															disabled={this.state.visualization==="scatter"}
															onClick={()=>this.setState({visualization: "scatter"})}
														>
															<span className="mdi mdi-chart-scatter-plot mdi-24px"/>
														</Button>
													</Tooltip>	
												</React.Fragment>: null
											}
											<Tooltip title={`${this.state.expanded ? "Collapse": "View"} ${this.props.preferred_name_singular[this.props.model]} information`}>
												<Button onClick={this.handleExpandClick}>
													<span className={`mdi mdi-24px mdi-chevron-${this.state.expanded ? "up": "down"}`}/>
												</Button>
											</Tooltip>
										</Grid>
										<Collapse in={this.state.expanded} timeout="auto" unmountOnExit>
											<Grid item xs={12}>
												{this.metaTab()}
											</Grid>
											
										</Collapse>
										<Grid item xs={12}>
											{this.visualizations()}
										</Grid>
									</Grid>
								</Grid>
								{/* <Grid item xs={12}>
									<Divider/>
									
								</Grid> */}
							</Grid>
						</CardContent>
					</Card>
				</Grid>
				{this.props.middleComponents!==undefined ? 
					<Grid item xs={12}>
						{this.props.middleComponents()}
					</Grid> 
					: null}
				<Grid item xs={12}>
					{this.ChildComponent()}
				</Grid>
				{this.props.bottomComponents!==undefined ? 
					<Grid item xs={12}>
						{this.props.bottomComponents()}
					</Grid> : null}
			</Grid>
		)
	}
}

EnrichmentPage.propTypes = {
	model: PropTypes.string.isRequired,
	id: PropTypes.string.isRequired,
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
	})
}
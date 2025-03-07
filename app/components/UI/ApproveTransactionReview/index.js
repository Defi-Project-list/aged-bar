import React, { PureComponent } from 'react';
import { StyleSheet, View, TouchableOpacity, InteractionManager, Linking } from 'react-native';
import ActionView from '../../UI/ActionView';
import Clipboard from '@react-native-community/clipboard';
import PropTypes from 'prop-types';
import { getApproveNavbar } from '../../UI/Navbar';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import { getHost } from '../../../util/browser';
import contractMap from '@metamask/contract-metadata';
import { safeToChecksumAddress, renderShortAddress } from '../../../util/address';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import { setTransactionObject } from '../../../actions/transaction';
import { util } from '@metamask/controllers';
import { renderFromWei, weiToFiatNumber, fromTokenMinimalUnit, toTokenMinimalUnit } from '../../../util/number';
import currencySymbols from '../../../util/currency-symbols.json';
import {
	getTicker,
	getNormalizedTxState,
	getActiveTabUrl,
	getMethodData,
	decodeApproveData,
	generateApproveData
} from '../../../util/transactions';
import { showAlert } from '../../../actions/alert';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import TransactionHeader from '../../UI/TransactionHeader';
import AccountInfoCard from '../../UI/AccountInfoCard';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import TransactionReviewDetailsCard from '../../UI/TransactionReview/TransactionReivewDetailsCard';
import Device from '../../../util/Device';
import AppConstants from '../../../core/AppConstants';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import { withNavigation } from 'react-navigation';
import { getNetworkName, isMainNet, isMainnetByChainId } from '../../../util/networks';
import scaling from '../../../util/scaling';
import { capitalize } from '../../../util/general';
import EditPermission, { MINIMUM_VALUE } from './EditPermission';
import Logger from '../../../util/Logger';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import InfoModal from '../Swaps/components/InfoModal';
import Text from '../../Base/Text';

const { hexToBN } = util;
const styles = StyleSheet.create({
	networkFee: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		borderWidth: 1,
		borderColor: colors.grey200,
		borderRadius: 10,
		padding: 16
	},
	networkFeeArrow: {
		paddingLeft: 20,
		marginTop: 2
	},
	section: {
		minWidth: '100%',
		width: '100%',
		paddingVertical: 10
	},
	title: {
		...fontStyles.bold,
		fontSize: scaling.scale(24),
		textAlign: 'center',
		color: colors.black,
		lineHeight: 34,
		marginVertical: 16,
		paddingHorizontal: 16
	},
	explanation: {
		...fontStyles.normal,
		fontSize: 14,
		textAlign: 'center',
		color: colors.black,
		lineHeight: 20,
		paddingHorizontal: 16
	},
	editPermissionText: {
		...fontStyles.bold,
		color: colors.blue,
		fontSize: 12,
		lineHeight: 20,
		textAlign: 'center',
		marginVertical: 20,
		borderWidth: 1,
		borderRadius: 20,
		borderColor: colors.blue,
		paddingVertical: 8,
		paddingHorizontal: 16
	},
	viewDetailsText: {
		...fontStyles.normal,
		color: colors.blue,
		fontSize: 12,
		lineHeight: 16,
		marginTop: 8,
		textAlign: 'center'
	},
	actionTouchable: {
		flexDirection: 'column',
		alignItems: 'center'
	},
	sectionLeft: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 14,
		flex: 1
	},
	sectionRight: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 14,
		flex: 1,
		textTransform: 'uppercase',
		textAlign: 'right'
	},
	errorWrapper: {
		marginTop: 12,
		paddingHorizontal: 10,
		paddingVertical: 8,
		backgroundColor: colors.red000,
		borderColor: colors.red,
		borderRadius: 8,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	error: {
		color: colors.red,
		fontSize: 12,
		lineHeight: 16,
		...fontStyles.normal,
		textAlign: 'center'
	},
	underline: {
		textDecorationLine: 'underline',
		...fontStyles.bold
	},
	actionViewWrapper: {
		height: Device.isMediumDevice() ? 200 : 350
	},
	actionViewChildren: {
		height: 300
	},
	paddingHorizontal: {
		paddingHorizontal: 16
	},
	gasInfoContainer: {
		paddingHorizontal: 2
	},
	gasInfoIcon: {
		color: colors.blue
	},
	hitSlop: {
		top: 10,
		left: 10,
		bottom: 10,
		right: 10
	}
});

const { ORIGIN_DEEPLINK, ORIGIN_QR_CODE } = AppConstants.DEEPLINKS;

/**
 * PureComponent that manages ERC20 approve from the dapp browser
 */
class ApproveTransactionReview extends PureComponent {
	static navigationOptions = ({ navigation }) => getApproveNavbar('approve.title', navigation);

	static propTypes = {
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Callback triggered when this transaction is cancelled
		 */
		onCancel: PropTypes.func,
		/**
		 * Callback triggered when this transaction is confirmed
		 */
		onConfirm: PropTypes.func,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Transaction state
		 */
		transaction: PropTypes.object.isRequired,
		/**
		 * Action that shows the global alert
		 */
		showAlert: PropTypes.func,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string,
		/**
		 * Number of tokens
		 */
		tokensLength: PropTypes.number,
		/**
		 * Number of accounts
		 */
		accountsLength: PropTypes.number,
		/**
		 * A string representing the network name
		 */
		providerType: PropTypes.string,
		/**
		 * Function to change the mode
		 */
		onModeChange: PropTypes.func,
		/**
		 * Error coming from gas component
		 */
		gasError: PropTypes.string,
		/**
		 * Warning coming from high gas set in CustomGas component
		 */
		warningGasPriceHigh: PropTypes.string,
		/**
		 * Primary currency, either ETH or Fiat
		 */
		primaryCurrency: PropTypes.string,
		/**
		 * Active tab URL, the currently active tab url
		 */
		activeTabUrl: PropTypes.string,
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * Network id
		 */
		network: PropTypes.string,
		/**
		 * True if transaction is over the available funds
		 */
		over: PropTypes.bool,
		/**
		 * Function to set analytics params
		 */
		onSetAnalyticsParams: PropTypes.func,
		/**
		 * A string representing the network chainId
		 */
		chainId: PropTypes.string
	};

	state = {
		viewData: false,
		editPermissionVisible: false,
		host: undefined,
		originalApproveAmount: undefined,
		totalGas: undefined,
		totalGasFiat: undefined,
		tokenSymbol: undefined,
		spendLimitUnlimitedSelected: true,
		spendLimitCustomValue: undefined,
		ticker: getTicker(this.props.ticker),
		viewDetails: false,
		spenderAddress: '0x...',
		transaction: this.props.transaction,
		token: {},
		showGasTooltip: false
	};

	customSpendLimitInput = React.createRef();
	originIsWalletConnect = this.props.transaction.origin?.includes(WALLET_CONNECT_ORIGIN);

	componentDidMount = async () => {
		const {
			transaction: { origin, to, gas, gasPrice, data },
			conversionRate
		} = this.props;
		const { AssetsContractController } = Engine.context;
		const host = getHost(this.originIsWalletConnect ? origin.split(WALLET_CONNECT_ORIGIN)[1] : origin);
		let tokenSymbol, tokenDecimals;
		const contract = contractMap[safeToChecksumAddress(to)];
		if (!contract) {
			try {
				tokenDecimals = await AssetsContractController.getTokenDecimals(to);
				tokenSymbol = await AssetsContractController.getAssetSymbol(to);
			} catch (e) {
				tokenSymbol = 'ERC20 Token';
				tokenDecimals = 18;
			}
		} else {
			tokenSymbol = contract.symbol;
			tokenDecimals = contract.decimals;
		}
		const { spenderAddress, encodedAmount } = decodeApproveData(data);
		const approveAmount = fromTokenMinimalUnit(hexToBN(encodedAmount), tokenDecimals);
		const totalGas = gas?.mul(gasPrice);
		const { name: method } = await getMethodData(data);

		this.setState(
			{
				host,
				method,
				originalApproveAmount: approveAmount,
				tokenSymbol,
				token: { symbol: tokenSymbol, decimals: tokenDecimals },
				totalGas: renderFromWei(totalGas),
				totalGasFiat: weiToFiatNumber(totalGas, conversionRate),
				spenderAddress,
				encodedAmount
			},
			() => {
				AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.APPROVAL_STARTED, this.getAnalyticsParams());
			}
		);
	};

	componentDidUpdate(previousProps) {
		const {
			transaction: { gas, gasPrice },
			conversionRate
		} = this.props;
		const totalGas = gas?.mul(gasPrice);
		if (
			previousProps.transaction.gas !== this.props.transaction.gas ||
			previousProps.transaction.gasPrice !== this.props.transaction.gasPrice
		) {
			// eslint-disable-next-line react/no-did-update-set-state
			this.setState({
				totalGas: renderFromWei(totalGas),
				totalGasFiat: weiToFiatNumber(totalGas, conversionRate)
			});
		}
	}

	getAnalyticsParams = () => {
		try {
			const { activeTabUrl, transaction, onSetAnalyticsParams } = this.props;
			const { tokenSymbol, originalApproveAmount, encodedAmount } = this.state;
			const { NetworkController } = Engine.context;
			const { chainId, type } = NetworkController?.state?.provider || {};
			const isDapp = !Object.values(AppConstants.DEEPLINKS).includes(transaction?.origin);
			const unlimited = encodedAmount === 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
			const params = {
				dapp_host_name: transaction?.origin,
				dapp_url: isDapp ? activeTabUrl : undefined,
				network_name: type,
				chain_id: chainId,
				active_currency: { value: tokenSymbol, anonymous: true },
				number_tokens_requested: { value: originalApproveAmount, anonymous: true },
				unlimited_permission_requested: unlimited,
				referral_type: isDapp ? 'dapp' : transaction?.origin
			};
			// Send analytics params to parent component so it's available when cancelling and confirming
			onSetAnalyticsParams && onSetAnalyticsParams(params);

			return params;
		} catch (error) {
			return {};
		}
	};

	trackApproveEvent = event => {
		const { transaction, tokensLength, accountsLength, providerType } = this.props;
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEventWithParameters(event, {
				view: transaction.origin,
				numberOfTokens: tokensLength,
				numberOfAccounts: accountsLength,
				network: providerType
			});
		});
	};

	toggleViewData = () => {
		const { viewData } = this.state;
		this.setState({ viewData: !viewData });
	};

	toggleViewDetails = () => {
		const { viewDetails } = this.state;
		Analytics.trackEvent(ANALYTICS_EVENT_OPTS.DAPP_APPROVE_SCREEN_VIEW_DETAILS);
		this.setState({ viewDetails: !viewDetails });
	};

	toggleEditPermission = () => {
		const { editPermissionVisible } = this.state;
		!editPermissionVisible && this.trackApproveEvent(ANALYTICS_EVENT_OPTS.DAPP_APPROVE_SCREEN_EDIT_PERMISSION);
		this.setState({ editPermissionVisible: !editPermissionVisible });
	};

	onPressSpendLimitUnlimitedSelected = () => {
		this.setState({ spendLimitUnlimitedSelected: true, spendLimitCustomValue: undefined });
	};

	onPressSpendLimitCustomSelected = () => {
		this.setState({ spendLimitUnlimitedSelected: false });
		setTimeout(
			() =>
				this.customSpendLimitInput &&
				this.customSpendLimitInput.current &&
				this.customSpendLimitInput.current.focus(),
			100
		);
	};

	onSpendLimitCustomValueChange = value => {
		this.setState({ spendLimitCustomValue: value });
	};

	copyContractAddress = async () => {
		const { transaction } = this.props;
		await Clipboard.setString(transaction.to);
		this.props.showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: { msg: strings('transactions.address_copied_to_clipboard') }
		});
	};

	edit = () => {
		const { onModeChange } = this.props;
		Analytics.trackEvent(ANALYTICS_EVENT_OPTS.TRANSACTIONS_EDIT_TRANSACTION);
		onModeChange && onModeChange('edit');
	};

	onEditPermissionSetAmount = () => {
		const {
			token,
			spenderAddress,
			spendLimitUnlimitedSelected,
			originalApproveAmount,
			spendLimitCustomValue,
			transaction
		} = this.state;

		try {
			const uint = toTokenMinimalUnit(
				spendLimitUnlimitedSelected ? originalApproveAmount : spendLimitCustomValue,
				token.decimals
			).toString(10);

			const approvalData = generateApproveData({
				spender: spenderAddress,
				value: Number(uint).toString(16)
			});
			const newApprovalTransaction = { ...transaction, data: approvalData };
			setTransactionObject(newApprovalTransaction);
		} catch (err) {
			Logger.log('Failed to setTransactionObject', err);
		}
		this.toggleEditPermission();
		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.APPROVAL_PERMISSION_UPDATED, this.getAnalyticsParams());
	};

	openLinkAboutGas = () =>
		Linking.openURL('https://community.metamask.io/t/what-is-gas-why-do-transactions-take-so-long/3172');

	toggleGasTooltip = () => this.setState(state => ({ showGasTooltip: !state.showGasTooltip }));

	renderGasTooltip = () => {
		const isMainnet = isMainnetByChainId(this.props.chainId);
		return (
			<InfoModal
				isVisible={this.state.showGasTooltip}
				title={strings(`transaction.gas_education_title${isMainnet ? '_ethereum' : ''}`)}
				toggleModal={this.toggleGasTooltip}
				body={
					<View>
						<Text grey infoModal>
							{strings('transaction.gas_education_1')}
							{strings(`transaction.gas_education_2${isMainnet ? '_ethereum' : ''}`)}{' '}
							<Text bold>{strings('transaction.gas_education_3')}</Text>
						</Text>
						<Text grey infoModal>
							{strings('transaction.gas_education_4')}
						</Text>
						<TouchableOpacity onPress={this.openLinkAboutGas}>
							<Text grey link infoModal>
								{strings('transaction.gas_education_learn_more')}
							</Text>
						</TouchableOpacity>
					</View>
				}
			/>
		);
	};

	renderEditPermission = () => {
		const {
			host,
			spendLimitUnlimitedSelected,
			tokenSymbol,
			spendLimitCustomValue,
			originalApproveAmount
		} = this.state;

		const _spendLimitCustomValue = spendLimitCustomValue ?? MINIMUM_VALUE;

		return (
			<EditPermission
				host={host}
				spendLimitUnlimitedSelected={spendLimitUnlimitedSelected}
				tokenSymbol={tokenSymbol}
				spendLimitCustomValue={_spendLimitCustomValue}
				originalApproveAmount={originalApproveAmount}
				onSetApprovalAmount={this.onEditPermissionSetAmount}
				onSpendLimitCustomValueChange={this.onSpendLimitCustomValueChange}
				onPressSpendLimitUnlimitedSelected={this.onPressSpendLimitUnlimitedSelected}
				onPressSpendLimitCustomSelected={this.onPressSpendLimitCustomSelected}
				toggleEditPermission={this.toggleEditPermission}
			/>
		);
	};

	renderDetails = () => {
		const { host, tokenSymbol, totalGas, totalGasFiat, ticker, spenderAddress } = this.state;

		const {
			primaryCurrency,
			currentCurrency,
			gasError,
			activeTabUrl,
			transaction: { origin },
			network,
			over,
			warningGasPriceHigh
		} = this.props;
		const is_main_net = isMainNet(network);
		const isFiat = primaryCurrency.toLowerCase() === 'fiat';
		const currencySymbol = currencySymbols[currentCurrency];
		const totalGasFiatRounded = Math.round(totalGasFiat * 100) / 100;
		const originIsDeeplink = origin === ORIGIN_DEEPLINK || origin === ORIGIN_QR_CODE;
		const errorPress = is_main_net ? this.buyEth : this.gotoFaucet;
		const networkName = capitalize(getNetworkName(network));
		const errorLinkText = is_main_net
			? strings('transaction.buy_more_eth')
			: strings('transaction.get_ether', { networkName });

		return (
			<>
				<View style={styles.section} testID={'approve-screen'}>
					<TransactionHeader
						currentPageInformation={{ origin, spenderAddress, title: host, url: activeTabUrl }}
					/>
					<Text reset style={styles.title} testID={'allow-access'}>
						{strings(
							`spend_limit_edition.${originIsDeeplink ? 'allow_to_address_access' : 'allow_to_access'}`,
							{ tokenSymbol }
						)}
					</Text>
					<Text reset style={styles.explanation}>
						{`${strings(
							`spend_limit_edition.${originIsDeeplink ? 'you_trust_this_address' : 'you_trust_this_site'}`
						)}`}
					</Text>
					<View style={styles.actionViewWrapper}>
						<ActionView
							confirmButtonMode="confirm"
							cancelText={strings('transaction.reject')}
							confirmText={strings('transactions.approve')}
							onCancelPress={this.onCancelPress}
							onConfirmPress={this.onConfirmPress}
						>
							<View style={styles.actionViewChildren}>
								<TouchableOpacity style={styles.actionTouchable} onPress={this.toggleEditPermission}>
									<Text reset style={styles.editPermissionText}>
										{strings('spend_limit_edition.edit_permission')}
									</Text>
								</TouchableOpacity>
								<View style={styles.paddingHorizontal}>
									<AccountInfoCard />
									<View style={styles.section}>
										<TouchableOpacity onPress={this.edit}>
											<View style={styles.networkFee}>
												<Text reset style={styles.sectionLeft}>
													{strings('transaction.transaction_fee')}
													<TouchableOpacity
														style={styles.gasInfoContainer}
														onPress={this.toggleGasTooltip}
														hitSlop={styles.hitSlop}
													>
														<MaterialCommunityIcons
															name="information"
															size={13}
															style={styles.gasInfoIcon}
														/>
													</TouchableOpacity>
												</Text>
												<Text reset style={styles.sectionRight}>
													{isFiat && currencySymbol}
													{isFiat ? totalGasFiatRounded : totalGas} {!isFiat && ticker}
												</Text>
												<View style={styles.networkFeeArrow}>
													<IonicIcon
														name="ios-arrow-forward"
														size={16}
														color={colors.grey00}
													/>
												</View>
											</View>
										</TouchableOpacity>
										{gasError && (
											<View style={styles.errorWrapper}>
												<TouchableOpacity onPress={errorPress}>
													<Text reset style={styles.error}>
														{gasError}
													</Text>
													{/* only show buy more on mainnet */}
													{over && is_main_net && (
														<Text reset style={[styles.error, styles.underline]}>
															{errorLinkText}
														</Text>
													)}
												</TouchableOpacity>
											</View>
										)}
										{!!warningGasPriceHigh && (
											<View style={styles.errorWrapper}>
												<Text reset style={styles.error}>
													{warningGasPriceHigh}
												</Text>
											</View>
										)}
										{!gasError && (
											<TouchableOpacity
												style={styles.actionTouchable}
												onPress={this.toggleViewDetails}
											>
												<View>
													<Text reset style={styles.viewDetailsText}>
														{strings('spend_limit_edition.view_details')}
													</Text>
												</View>
											</TouchableOpacity>
										)}
									</View>
								</View>
							</View>
						</ActionView>
					</View>
				</View>
				{this.renderGasTooltip()}
			</>
		);
	};

	renderTransactionReview = () => {
		const {
			host,
			method,
			viewData,
			tokenSymbol,
			originalApproveAmount,
			spendLimitUnlimitedSelected,
			spendLimitCustomValue,
			transaction: { to, data }
		} = this.state;
		const allowance = (!spendLimitUnlimitedSelected && spendLimitCustomValue) || originalApproveAmount;
		return (
			<TransactionReviewDetailsCard
				toggleViewDetails={this.toggleViewDetails}
				toggleViewData={this.toggleViewData}
				copyContractAddress={this.copyContractAddress}
				address={renderShortAddress(to)}
				host={host}
				allowance={allowance}
				tokenSymbol={tokenSymbol}
				data={data}
				method={method}
				displayViewData={viewData}
			/>
		);
	};

	buyEth = () => {
		const { navigation } = this.props;
		/* this is kinda weird, we have to reject the transaction to collapse the modal */
		this.onCancelPress();
		navigation.navigate('PaymentMethodSelector');
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.RECEIVE_OPTIONS_PAYMENT_REQUEST);
		});
	};

	onCancelPress = () => {
		const { onCancel } = this.props;
		onCancel && onCancel();
	};

	onConfirmPress = () => {
		const { onConfirm } = this.props;
		onConfirm && onConfirm();
	};

	gotoFaucet = () => {
		const mmFaucetUrl = 'https://faucet.metamask.io/';
		InteractionManager.runAfterInteractions(() => {
			this.onCancelPress();
			this.props.navigation.navigate('BrowserView', {
				newTabUrl: mmFaucetUrl
			});
		});
	};

	render = () => {
		const { viewDetails, editPermissionVisible } = this.state;

		return (
			<View>
				{viewDetails
					? this.renderTransactionReview()
					: editPermissionVisible
					? this.renderEditPermission()
					: this.renderDetails()}
			</View>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	transaction: getNormalizedTxState(state),
	accountsLength: Object.keys(state.engine.backgroundState.AccountTrackerController.accounts || {}).length,
	tokensLength: state.engine.backgroundState.AssetsController.tokens.length,
	providerType: state.engine.backgroundState.NetworkController.provider.type,
	primaryCurrency: state.settings.primaryCurrency,
	activeTabUrl: getActiveTabUrl(state),
	network: state.engine.backgroundState.NetworkController.network,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId
});

const mapDispatchToProps = dispatch => ({
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction)),
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withNavigation(ApproveTransactionReview));
